import { updateCharts } from "./charts.js";
import { setAnalysisData } from "./downloads.js";


const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");

const vmafResult = document.getElementById("vmaf-result");  // Elemento para mostrar los resultados de VMAF
const psnrResult = document.getElementById("psnr-result");  // Elemento para mostrar los resultados de PSNR
const ssimResult = document.getElementById("ssim-result");  // Elemento para mostrar los resultados de SSIM

let lastAnalysisData = null;  // Variable para almacenar los datos del último análisis realizado 

form.addEventListener("submit", async (event) => {  // Maneja el evento de envío del formulario 
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];  // Obtiene el archivo de video de referencia 
    const distortedVideo = document.getElementById("distorted-video").files[0];  // Obtiene el archivo de video distorsionado 

    if (!referenceVideo || !distortedVideo) {  // Verifica si ambos archivos de video están seleccionados 
        vmafResult.textContent = "please select both videos.";
        return;
    }

    vmafResult.textContent = "analyzing, please wait...";
    vmafResult.classList.add("analyzing");

    const formData = new FormData();  // Crea un objeto FormData para enviar los archivos de video al servidor 
    formData.append("reference", referenceVideo);  // Agrega el archivo de video de referencia al FormData 
    formData.append("distorted", distortedVideo);  // Agrega el archivo de video distorsionado al FormData 

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

        updateCharts(data);


    }
    catch (error) {
            console.error(error);
            vmafResult.textContent = "unable to connect to the server.";
    }
    finally {
            vmafResult.classList.remove("analyzing");
    }
});