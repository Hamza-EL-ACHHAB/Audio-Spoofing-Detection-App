const uploadButton = document.getElementById('upload-button');
const audioFileInput = document.getElementById('audio-file');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const pauseButton = document.getElementById('pauseButton');
const responseDiv = document.getElementById('response');
const metadataDisplay = document.getElementById('metadata-display');

let gumStream; 
let rec; 
let input; 
let audioContext; 

function startAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed');
        });
    }
}

function createDownloadLink(blob, filename = 'audio.wav') {
    if (!(blob instanceof Blob)) {
        console.error('Invalid blob object:', blob);
        return null;
    }

    const audioUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = audioUrl;
    downloadLink.download = filename;
    downloadLink.textContent = `Download ${filename}`;
    downloadLink.style.display = 'block';
    return downloadLink;
}
// Function to fetch metadata from the text file
async function fetchMetadata() {
  try {
    const response = await fetch('../metadata.txt'); // Ensure correct file path
    if (!response.ok) {
      throw new Error('Failed to fetch metadata');
    }
    const text = await response.text();
    console.log('Metadata file content:', text); // Debugging

    // Split text into lines, ensuring no empty entries
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 1) {
      throw new Error('Metadata file is empty or malformed');
    }

    // Process metadata (handle spaces and case differences)
    const metadata = lines.map(line => {
      const parts = line.split(';').map(part => part.trim()); // Trim each value
      if (parts.length === 3) {
        return { 
          name: parts[0].toLowerCase(), // Normalize case
          extension: parts[1], 
          compression: parts[2] 
        };
      }
      return null; // Skip invalid lines
    }).filter(entry => entry !== null);

    return metadata;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return [];
  }
}


// Function to display metadata in a table


function displayMetadata(files, metadata) {
    metadataDisplay.innerHTML = ''; // Clear previous metadata

    // Create a table
    const table = document.createElement('table');
    table.classList.add('metadata-table');

    // Create table headers
    const headerRow = document.createElement('tr');
    ['File Name', 'Extension', 'Compression Type'].forEach(headerText => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });
    table.appendChild(headerRow);

    // Process uploaded files
    files.forEach(file => {
        const fileName = file.name.toLowerCase().trim(); // Normalize case & trim spaces
        
        // **Normalize Metadata for Matching**
        const fileMetadata = metadata.find(m => m.name.toLowerCase().trim() === fileName);

        const row = document.createElement('tr');

        // File Name
        const fileNameCell = document.createElement('td');
        fileNameCell.textContent = file.name;
        row.appendChild(fileNameCell);

        // Extension
        const extensionCell = document.createElement('td');
        extensionCell.textContent = fileMetadata ? fileMetadata.extension : 'N/A';
        row.appendChild(extensionCell);

        // Compression Type
        const compressionCell = document.createElement('td');
        compressionCell.textContent = fileMetadata ? fileMetadata.compression : 'N/A';
        row.appendChild(compressionCell);

        table.appendChild(row);
    });

    // Append table to metadata display section
    metadataDisplay.appendChild(table);
}

async function uploadAudio(files) {
    if (!files || files.length === 0) {
        alert('Please select or record files first!');
        return;
    }

    const formData = new FormData();
    const filesArray = Array.from(files);
    for (let i = 0; i < filesArray.length; i++) {
        formData.append('files', filesArray[i]);
    }

    responseDiv.textContent = 'Uploading and analyzing audio...';

    try {
        const metadataObj = await fetchMetadata();
        displayMetadata(filesArray, metadataObj);

        const response = await fetch('http://127.0.0.1:8000/predict/', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Server error: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        responseDiv.innerHTML = '';

        data.forEach((result, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.innerHTML = `File: <b>${result.filename}</b>, Label: <b>${result.label}</b>, Confidence: <b>${result.confidence}</b>`;
            responseDiv.appendChild(resultDiv);

            if (filesArray[index] instanceof Blob) {
                const downloadLink = createDownloadLink(filesArray[index], `uploaded-audio-${index}.wav`);
                if (downloadLink) {
                    responseDiv.appendChild(downloadLink);
                }
            } else {
                console.warn('File is not a Blob:', filesArray[index]);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        responseDiv.textContent = 'Error: ' + error.message;
    }
}

uploadButton.addEventListener('click', () => {
    const files = audioFileInput.files;
    if (!files || files.length === 0) {
        alert('Please select files first!');
        return;
    }
    uploadAudio(files);
});

recordButton.addEventListener('click', async () => {
    startAudioContext();
    const constraints = { audio: true, video: false };

    try {
        gumStream = await navigator.mediaDevices.getUserMedia(constraints);
        input = audioContext.createMediaStreamSource(gumStream);
        rec = new Recorder(input, { numChannels: 1 });
        rec.record();

        recordButton.disabled = true;
        stopButton.disabled = false;
        pauseButton.disabled = false;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Error accessing microphone: ' + error.message);
    }
});

stopButton.addEventListener('click', () => {
    stopRecording();
});

pauseButton.addEventListener('click', () => {
    if (rec.recording) {
        rec.stop();
        pauseButton.textContent = 'Resume';
    } else {
        rec.record();
        pauseButton.textContent = 'Pause';
    }
});

function stopRecording() {
    stopButton.disabled = true;
    recordButton.disabled = false;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';

    rec.stop();
    gumStream.getAudioTracks()[0].stop();

    rec.exportWAV(async (blob) => {
        if (blob.size === 0) {
            console.error('The audio file is empty.');
            responseDiv.textContent = 'Error: The audio file is empty.';
            return;
        }

        try {
            const downloadLink = createDownloadLink(blob, 'recorded-audio.wav');
            responseDiv.innerHTML = '';
            if (downloadLink) {
                responseDiv.appendChild(downloadLink);
            }

            await uploadAudio([blob]);
        } catch (error) {
            console.error('Error processing audio:', error);
            responseDiv.textContent = 'Error: ' + error.message;
        }
    });
}