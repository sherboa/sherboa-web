import { updateCharts } from "./charts.js";
import { setAnalysisData } from "./downloads.js";
import { initVideoSync } from "./video-sync.js";

const API_URL = "https://sherboa-api.duckdns.org";
const FALLBACK_FPS = 30;

// ---------------------------------------------------------
// 1. Obtener referencias a los elementos HTML.
// ---------------------------------------------------------

const form = document.getElementById("vmaf-form");
const analyzingMessage = document.getElementById("analyzing-message");

const referenceThumbnail = document.getElementById("reference-thumbnail");
const distortedThumbnail = document.getElementById("distorted-thumbnail");

const vmafResult = document.getElementById("vmaf-result");
const psnrResult = document.getElementById("psnr-result");
const ssimResult = document.getElementById("ssim-result");

// ---------------------------------------------------------
// 2. Estado de la sincronización y las miniaturas.
// ---------------------------------------------------------

let currentAnalysisData = null;

// Inicializa los controles de sincronización; el callback actualiza las miniaturas cuando cambia el offset o el timestamp
const videoSync = initVideoSync({
    onChange(syncState) {
        if (!syncState || !currentAnalysisData) {
            hideThumbnails();
            return;
        }

        showThumbnails(
            currentAnalysisData,
            syncState.referenceTime,
            syncState.distortedTime,
            syncState.distortedInRange
        );
    }
});

if (!videoSync) {  // Si el módulo no pudo inicializarse, se evita que falle el resto del script
    console.error("Unable to initialize video synchronization.");
}

// ---------------------------------------------------------
// 3. Gestión de las miniaturas.
// ---------------------------------------------------------

// Oculta y limpia las miniaturas para evitar mostrar imágenes de un análisis anterior
function hideThumbnails() {
    referenceThumbnail.hidden = true;
    distortedThumbnail.hidden = true;

    referenceThumbnail.removeAttribute("src");
    distortedThumbnail.removeAttribute("src");
}

// Convierte un timestamp en el nombre de la miniatura correspondiente; la API genera una miniatura por segundo, comenzando por el segundo cero.
function getThumbnailFilename(timestamp) {
    const thumbnailIndex = Math.max(1, Math.round(timestamp) + 1);

    return `thumbnail_${String(thumbnailIndex).padStart(4, "0")}.jpg`;
}

function showThumbnails(  // Actualiza las miniaturas de referencia y distorsionado según los timestamps seleccionados
    analysisData,
    referenceTimestamp,
    distortedTimestamp,
    distortedInRange
) {
    if (
        !analysisData?.thumbnails_available ||
        !analysisData.analysis_id
    ) {
        hideThumbnails();
        return;
    }

    const thumbnailBaseUrl =
        `${API_URL}/thumbnails/${analysisData.analysis_id}`;

    const referenceFilename =
        getThumbnailFilename(referenceTimestamp);

    referenceThumbnail.src =
        `${thumbnailBaseUrl}/reference/${referenceFilename}`;

    referenceThumbnail.hidden = false;

    if (  // Si el offset deja el timestamp fuera del video distorsionado, se oculta su miniatura y se evita solicitar un archivo inexistente
        !distortedInRange ||
        !Number.isFinite(distortedTimestamp) ||
        distortedTimestamp < 0
    ) {
        distortedThumbnail.hidden = true;
        distortedThumbnail.removeAttribute("src");
        return;
    }

    const distortedFilename =
        getThumbnailFilename(distortedTimestamp);

    distortedThumbnail.src =
        `${thumbnailBaseUrl}/distorted/${distortedFilename}`;

    distortedThumbnail.hidden = false;
}

referenceThumbnail.addEventListener("error", () => {  // Si una miniatura no está disponible, su error no invalida el análisis de calidad
    referenceThumbnail.hidden = true;
});

distortedThumbnail.addEventListener("error", () => {
    distortedThumbnail.hidden = true;
});

// ---------------------------------------------------------
// 4. Formato de timestamps.
// ---------------------------------------------------------

function formatTimestamp(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = (safeSeconds % 60).toFixed(3);

    return `${String(minutes).padStart(2, "0")}:${String(
        Number(remainingSeconds).toFixed(3)
    ).padStart(6, "0")}`;
}

// ---------------------------------------------------------
// 5. Ejecutar el análisis.
// ---------------------------------------------------------

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const referenceVideo =
        document.getElementById("reference-video").files[0];

    const distortedVideo =
        document.getElementById("distorted-video").files[0];

    if (!referenceVideo || !distortedVideo) {
        vmafResult.textContent = "please select both videos.";
        return;
    }

    // Se descartan las miniaturas y los metadatos del análisis anterior
    currentAnalysisData = null;
    hideThumbnails();

    if (videoSync) {
        videoSync.clearMetadata();
    }

    analyzingMessage.textContent = "analyzing, please wait...";
    analyzingMessage.classList.add("analyzing");

    const formData = new FormData();
    formData.append("reference", referenceVideo);
    formData.append("distorted", distortedVideo);

    try {
        const response = await fetch(`${API_URL}/vmaf`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            vmafResult.textContent =
                data.detail || "analysis failed.";
            return;
        }

        setAnalysisData(data);  // Se conservan los resultados para gráficos y descargas

        document.getElementById("download-vmaf-chart").hidden = false;
        document.getElementById("download-psnr-chart").hidden = false;
        document.getElementById("download-ssim-chart").hidden = false;
        document.getElementById("download-data-container").hidden = false;

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

        updateCharts(data, (frameIndex) => {  // Los tres gráficos comparten el callback para seleccionar un instante
            const reportedFps = Number(data.video?.fps);

            const referenceFps =
                Number.isFinite(reportedFps) && reportedFps > 0
                    ? reportedFps
                    : FALLBACK_FPS;

            if (videoSync) {
                videoSync.setReferenceTime(frameIndex / referenceFps);
            }
        });


        // La sincronización necesita las duraciones de ambos videos; si la API todavía no devuelve los metadatos del distorsionado, se mantienen los resultados del análisis, pero no se habilita el offset.
        const referenceDuration = Number(data.video?.duration);
        const distortedDuration = Number(data.distorted_video?.duration);
        const referenceFps = Number(data.video?.fps);

        if (
            videoSync &&
            Number.isFinite(referenceDuration) &&
            referenceDuration > 0 &&
            Number.isFinite(distortedDuration) &&
            distortedDuration > 0
        ) {
            currentAnalysisData = data;

            videoSync.setVideoMetadata({
                referenceDuration,
                distortedDuration,
                fps: referenceFps
            });

            videoSync.setReferenceTime(0);  // Presenta las miniaturas inicialmente desde el segundo cero
        } else {
            hideThumbnails();

            if (!data.distorted_video?.duration) {
                console.warn(
                    "The API response does not include distorted video duration. Synchronization controls remain disabled."
                );
            }
        }
    }
    catch (error) {
        console.error(error);
        vmafResult.textContent = "unable to connect to the server.";
    }
    finally {
        vmafResult.classList.remove("analyzing");
        analyzingMessage.classList.remove("analyzing");
        analyzingMessage.textContent = "";
    }
});
