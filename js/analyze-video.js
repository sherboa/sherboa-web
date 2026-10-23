import { updateCharts } from "./charts.js";
import { setAnalysisData } from "./downloads.js";
import { initVideoSync } from "./video-sync.js";


const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");
const analyzingMessage = document.getElementById("analyzing-message");

const videoSync = initVideoSync();  // Inicializa los controles de sincronización de video
const referencePreview = document.getElementById("reference-preview");
const distortedPreview = document.getElementById("distorted-preview");
const referenceThumbnail = document.getElementById("reference-thumbnail");
const distortedThumbnail = document.getElementById("distorted-thumbnail");

referenceThumbnail.addEventListener("error", () => {
    referenceThumbnail.hidden = true;
});

distortedThumbnail.addEventListener("error", () => {
    distortedThumbnail.hidden = true;
});

const referenceTime = document.getElementById("reference-time");
const distortedTime = document.getElementById("distorted-time");
const vmafResult = document.getElementById("vmaf-result");  // Elemento para mostrar los resultados de VMAF
const psnrResult = document.getElementById("psnr-result");  // Elemento para mostrar los resultados de PSNR
const ssimResult = document.getElementById("ssim-result");  // Elemento para mostrar los resultados de SSIM

let lastAnalysisData = null;  // Variable para almacenar los datos del último análisis realizado 


function showThumbnails(analysisData, timestamp = 0) {
    if (!analysisData?.thumbnails_available || !analysisData.analysis_id) {
        return;
    }

    const thumbnailIndex = Math.max(1, Math.round(timestamp) + 1);
    const thumbnailFilename = `thumbnail_${String(thumbnailIndex).padStart(4, "0")}.jpg`;
    const thumbnailBaseUrl = `${API_URL}/thumbnails/${analysisData.analysis_id}`;

    referenceThumbnail.src = `${thumbnailBaseUrl}/reference/${thumbnailFilename}`;
    distortedThumbnail.src = `${thumbnailBaseUrl}/distorted/${thumbnailFilename}`;

    referenceThumbnail.hidden = false;
    distortedThumbnail.hidden = false;

    referencePreview.hidden = true;
    distortedPreview.hidden = true;

    referenceTime.textContent = formatTimestamp(timestamp);
    distortedTime.textContent = formatTimestamp(timestamp);
}

function formatTimestamp(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = (safeSeconds % 60).toFixed(3);

    return `${String(minutes).padStart(2, "0")}:${String(Number(remainingSeconds).toFixed(3)).padStart(6, "0")}`;
}

function resetThumbnails() {
    referenceThumbnail.removeAttribute("src");
    distortedThumbnail.removeAttribute("src");

    referenceThumbnail.hidden = true;
    distortedThumbnail.hidden = true;

    referencePreview.hidden = false;
    distortedPreview.hidden = false;
}

form.addEventListener("submit", async (event) => {  // Maneja el evento de envío del formulario 
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];  // Obtiene el archivo de video de referencia 
    const distortedVideo = document.getElementById("distorted-video").files[0];  // Obtiene el archivo de video distorsionado 

    if (!referenceVideo || !distortedVideo) {  // Verifica si ambos archivos de video están seleccionados 
        vmafResult.textContent = "please select both videos.";
        return;
    }

    analyzingMessage.textContent = "analyzing, please wait...";
    analyzingMessage.classList.add("analyzing");

    const formData = new FormData();  // Crea un objeto FormData para enviar los archivos de video al servidor 
    formData.append("reference", referenceVideo);  // Agrega el archivo de video de referencia al FormData 
    formData.append("distorted", distortedVideo);  // Agrega el archivo de video distorsionado al FormData 

    resetThumbnails();

    try {
        const response = await fetch(`${API_URL}/vmaf`, {  // Envía una solicitud POST al servidor para analizar los videos 
            method: "POST",
            body: formData
        });

        const data = await response.json();  // Convierte la respuesta del servidor a formato JSON 

        if (!response.ok) {
            vmafResult.textContent = data.detail || "analysis failed.";  // Muestra un mensaje de error si la respuesta del servidor no es exitosa 
            return;
        }

        lastAnalysisData = data;
        setAnalysisData(data);
        document.getElementById("download-vmaf-chart").hidden = false;  // Muestra el botón de descarga del gráfico de VMAF 
        document.getElementById("download-psnr-chart").hidden = false;  // Muestra el botón de descarga del gráfico de PSNR 
        document.getElementById("download-ssim-chart").hidden = false;  // Muestra el botón de descarga del gráfico de SSIM 
        document.getElementById("download-data-container").hidden = false;  // Muestra el contenedor del botón de descarga de datos 


        vmafResult.textContent = `VMAF
        mean: ${data.vmaf.mean}
        min: ${data.vmaf.min}
        max: ${data.vmaf.max}`;

        psnrResult.textContent = `PSNR [dB]
        mean: ${data.psnr.mean}
        min: ${data.psnr.min}
        max: ${data.psnr.max}`;

        ssimResult.textContent = `SSIM
        global (all): ${data.ssim["global (all)"]}
        y: ${data.ssim.y}
        u: ${data.ssim.u}
        v: ${data.ssim.v}`;

        updateCharts(data, (frameIndex) => {
            const fps = Number(data.video?.fps);

            if (!Number.isFinite(fps) || fps <= 0) {
                return;
            }

            showThumbnails(data, frameIndex / fps);
        });

        if (data.thumbnails_available) {
            showThumbnails(data, 0);
        }
    }
    catch (error) {
        console.error(error);
        vmafResult.textContent = "unable to connect to the server.";
    }
    finally {
        vmafResult.classList.remove("analyzing");
        analyzingMessage.textContent = "";
    }
});
