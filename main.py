import json
import torch
import torchaudio
import numpy as np
from torch import nn
import torch.nn.functional as F
from fastapi import FastAPI, UploadFile, HTTPException, File
import nest_asyncio
import uvicorn
from model_utils import (
    Model,
)  # Assurez-vous que la classe Model est correctement importée
import os
import soundfile as sf
import io
import tempfile
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Union
from calculate_modules import compute_eer  # Importer la fonction compute_eer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)  #
# App FastAPI
app = FastAPI()

# Configurer CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (peut être restreint)
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes HTTP
    allow_headers=["*"],  # Autorise tous les en-têtes
)


# Charger la configuration du modèle
def load_config(config_path):
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Erreur lors du chargement de la configuration : {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du chargement de la configuration: {e}",
        )


# Charger le modèle
def load_model(checkpoint_path, d_args):
    model = Model(d_args)
    try:
        # Load checkpoint
        checkpoint = torch.load(checkpoint_path, map_location=torch.device("cpu"))
        model.load_state_dict(checkpoint)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise
    model.eval()
    return model


# Prétraiter l'audio
def preprocess_audio(audio_path, sample_rate=16000):
    try:
        print(f"Chargement de l'audio: {audio_path}")
        waveform, sr = torchaudio.load(audio_path)
        print(f"Audio chargé: {audio_path}, Taux d'échantillonnage: {sr}")
        if sr != sample_rate:
            resample_transform = torchaudio.transforms.Resample(
                orig_freq=sr, new_freq=sample_rate
            )
            waveform = resample_transform(waveform)
        if waveform.size(0) > 1:
            waveform = torch.mean(
                waveform, dim=0, keepdim=True
            )  # Convertir en mono si stéréo
        return waveform
    except Exception as e:
        print(f"Erreur dans le prétraitement audio : {e}")
        raise HTTPException(
            status_code=500, detail=f"Erreur dans le prétraitement de l'audio: {e}"
        )


def infer(model, waveform, freq_aug=False):
    try:
        with torch.no_grad():
            last_hidden, output = model(waveform, Freq_aug=freq_aug)
            print("Sortie du modèle:", output)
            if output is None:
                raise ValueError("La sortie du modèle est nulle.")
            probabilities = F.softmax(output, dim=1)
            predicted_label = torch.argmax(probabilities, dim=1).item()
            confidence = probabilities[
                0
            ].tolist()  # Liste des probabilités pour toutes les classes
            max_confidence = 1 - max(confidence)  # La probabilité la plus élevée
            return (
                predicted_label,
                max_confidence,
            )  # Retourner également la probabilité la plus élevée
    except Exception as e:
        print(f"Erreur pendant l'inférence : {e}")
        raise


# Charger le modèle d'exemple
config_path = "./AASIST_ASVspoof5_Exp4_CL.conf"  # Remplacez par le chemin réel de votre fichier de config
config = load_config(config_path)
d_args = config["model_config"]
checkpoint_path = (
    "./Ex4_CLspeaker_sampler_eer0.164.pth"  # Remplacez par votre checkpoint
)
model = load_model(checkpoint_path, d_args)


@app.post("/predict/")
async def predict(files: List[UploadFile] = File(...)):
    """
    Endpoint to handle batch inference for multiple audio files.
    Accepts a list of audio files and returns inference results for each file.
    """
    responses = []
    bonafide_scores = []
    spoof_scores = []

    for file in files:
        try:
            logger.info(f"Processing file: {file.filename}")

            # Validate file format
            if not file.filename.endswith((".wav", ".flac")):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file format. Only .wav and .flac files are allowed.",
                )

            # Save the uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio_path = temp_audio.name
                temp_audio.write(await file.read())

            # Preprocess the audio file
            waveform = preprocess_audio(temp_audio_path)

            # Perform inference
            label, confidence = infer(model, waveform)

            # Store scores for EER calculation
            if label == 0:  # Bonafide
                bonafide_scores.append(confidence)
            else:  # Spoof
                spoof_scores.append(confidence)

            # Prepare the response
            response = {
                "filename": file.filename,
                "label": "Genuine" if label == 0 else "Spoof",
                "confidence": confidence,
                "status": "success",
            }
            responses.append(response)

            # Clean up the temporary file
            os.unlink(temp_audio_path)

        except Exception as e:
            responses.append(
                {"filename": file.filename, "error": str(e), "status": "failed"}
            )

    # Log collected scores for debugging
    logger.info(f"Bonafide scores: {bonafide_scores}")
    logger.info(f"Spoof scores: {spoof_scores}")

    # Calculate EER if we have scores for both bonafide and spoof
    if bonafide_scores and spoof_scores:
        eer, _, _, _ = compute_eer(np.array(bonafide_scores), np.array(spoof_scores))
        eer_percentage = eer * 100
        responses.append({"EER": f"{eer_percentage:.2f}%"})
        logger.info(f"Calculated EER: {eer_percentage:.2f}%")
    else:
        logger.info("Not enough data to calculate EER.")

    return responses


# Exécuter le serveur FastAPI dans Colab
nest_asyncio.apply()
import uvicorn

uvicorn.run(app, host="0.0.0.0", port=8000)
