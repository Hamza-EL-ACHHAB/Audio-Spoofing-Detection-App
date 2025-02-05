# Audio Spoofing Detection App

This project is an audio spoofing detection application that uses a deep learning model to determine whether an audio file is genuine (bonafide) or spoofed. The application consists of a backend built with **FastAPI** and a frontend built with **HTML**, **JavaScript**, and **CSS**.

## Features

- **Upload Audio**: Users can upload an audio file for analysis.
- **Record Audio**: Users can record audio directly in the browser.
- **Analyze Audio**: The backend processes the audio file using a pre-trained model and returns the result (genuine or spoofed) along with confidence scores.
- **Responsive UI**: The frontend is designed to be user-friendly and works on all devices.

## Prerequisites

- **Python 3.11**: Ensure you have Python 3.11 installed on your system.
- **Node.js**: Required for installing frontend dependencies (if any).
- **Git**: For cloning the repository.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Hamza-EL-ACHHAB/Audio-Spoofing-Detection-App.git
cd audio-spoofing-detection
```

### 2. Set Up the Backend

#### 1. Create a Virtual Environment

```bash
python -m venv .venv
```

#### 2. Activate the Virtual Environment

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

#### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Start the Backend Server

```bash
python main.py
```

The backend will start at [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Python Libraries Used

The following libraries are required for the backend. They are listed in `requirements.txt`:

- **FastAPI**: For building the backend API.
- **Uvicorn**: For serving the FastAPI application.
- **Torch**: For loading and running the deep learning model.
- **Torchaudio**: For audio preprocessing.
- **NumPy**: For numerical computations.
- **Soundfile**: For handling audio files.

To install all dependencies, run:

```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the backend server:

   ```bash
   python main.py
   ```

2. Open `index.html` in your browser.

3. Upload or record an audio file and click "Analyze" to see the results.

## API Endpoints

### POST /predict/

Accepts an audio file and returns the analysis result.

**Request**: file (audio file in .wav or .flac format).

**Response**:

```json
{
  "filename": "audio.wav",
  "label": "Genuine",
  "confidence": 0.95
}
```
