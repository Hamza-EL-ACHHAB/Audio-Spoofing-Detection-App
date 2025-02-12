# 🚀 Download and Run a Docker Image from Google Drive

This guide will help you **download a ASSIST API Docker image from Google Drive, load it into Docker, and run it as a container**.

## 🔹 Step 1: Download the Image

1. Click the link below to download the Docker image:
   - **[Download Image](https://drive.google.com/file/d/1elwPzNb2AK2yLdO8xeWaRUf8gdGRTpo6/view?usp=sharing)**
2. Save the file as `myimage.tar` in your preferred directory (e.g., `Downloads`).

## 🔹 Step 2: Install Docker

If you don’t have Docker installed, follow these steps:

- **Windows & Mac:** [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update
  sudo apt install docker.io -y
  ```

## 🔹 Step 3: Load the Docker Image

Open a terminal or command prompt and navigate to the directory where you downloaded the file:

- **Windows (Command Prompt/PowerShell):**

  ```powershell
  cd Downloads
  ```

- **Linux/macOS:**
  ```bash
  cd ~/Downloads
  ```

Now, load the Docker image using:

```bash
docker load -i myimage.tar
```

## 🔹 Step 4: Verify the Image

Check if the image was loaded successfully:

```bash
docker images
```

You should see `myimage` listed.

## 🔹 Step 5: Run the Docker Container

To start a container from the image:

```bash
docker run -it -p 8080:8000 --name myimage
```

- `-d` → Runs the container in detached mode (background).
- `-p 8080:8000` → Maps port **8080** on your system to port **80** in the container.
- `--name my_container` → Names the container `my_container`.
- `myimage` → The name of your Docker image.

## 🔹 Step 6: Check if the Container is Running

Run the following command:

```bash
docker ps
```

If your container is running, you should see it in the list.

## 🔹 Step 7: Stop and Remove the Container

To stop the container:

```bash
docker stop my_container
```

To remove the container:

```bash
docker rm my_container
```

---

## 🎯 Troubleshooting

- If you get a **"permission denied"** error on Linux/macOS, try running:
  ```bash
  sudo docker load -i myimage.tar
  sudo docker run -d -p 8080:80 --name my_container myimage
  ```
- If the port **8080** is already in use, try another one (e.g., `-p 9090:80`).

Enjoy running your Docker container! 🚀
