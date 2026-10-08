const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");

const vmafResult = document.getElementById("vmaf-result");  /* Elemento para mostrar los resultados de VMAF */
const psnrResult = document.getElementById("psnr-result");  /* Elemento para mostrar los resultados de PSNR */
const ssimResult = document.getElementById("ssim-result");  /* Elemento para mostrar los resultados de SSIM */
const vmafChartContainer = document.getElementById("vmaf-chart-container");  /* Contenedor del gráfico de VMAF */
const psnrChartContainer = document.getElementById("psnr-chart-container");  /* Contenedor del gráfico de PSNR */


form.addEventListener("submit", async (event) => {  /* Maneja el evento de envío del formulario */
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];  /* Obtiene el archivo de video de referencia */
    const distortedVideo = document.getElementById("distorted-video").files[0];  /* Obtiene el archivo de video distorsionado */

    if (!referenceVideo || !distortedVideo) {  /* Verifica si ambos archivos de video están seleccionados */
        vmafResult.textContent = "please select both videos.";
        return;
    }

    vmafResult.textContent = "analyzing...";

    const formData = new FormData();  /* Crea un objeto FormData para enviar los archivos de video al servidor */
    formData.append("reference", referenceVideo);  /* Agrega el archivo de video de referencia al FormData */
    formData.append("distorted", distortedVideo);  /* Agrega el archivo de video distorsionado al FormData */

    try {
        const response = await fetch(`${API_URL}/vmaf`, {  /* Envía una solicitud POST al servidor para analizar los videos */
            method: "POST",
            body: formData
        });

        const data = await response.json();  /* Convierte la respuesta del servidor a formato JSON */

        if (!response.ok) {
            vmafResult.textContent = data.detail || "analysis failed.";  /* Muestra un mensaje de error si la respuesta del servidor no es exitosa */
            return;
        }

        vmafResult.textContent = `VMAF
        mean: ${data.vmaf.mean}
        min: ${data.vmaf.min}
        max: ${data.vmaf.max}`;

        vmafChartContainer.style.display = "block";  /* Muestra el contenedor del gráfico de VMAF */

        const ctx = document.getElementById("vmaf-chart");  /* Obtiene el contexto del canvas para dibujar el gráfico de VMAF */

        new Chart(ctx, {  /* Crea un nuevo gráfico de VMAF usando Chart.js */
            type: "line",  /* Tipo de gráfico: línea */
            data: {
                labels: data.vmaf.per_frame.map((_, index) => index + 1),  /* Etiquetas para el eje x: número de frame */
                datasets: [{
                    label: "VMAF",
                    data: data.vmaf.per_frame,
                    tension: 0.2  /* Suaviza la línea del gráfico */
                }]
            },
            options: {
                responsive: true,  /* Hace que el gráfico sea responsivo */
                maintainAspectRatio: false,  /* Permite que el gráfico se ajuste al tamaño del contenedor */
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "frame"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "VMAF"
                        }
                    }
                }
            }
        });


        psnrResult.textContent = `PSNR
        mean: ${data.psnr.mean}
        min: ${data.psnr.min}
        max: ${data.psnr.max}`;

        psnrChartContainer.style.display = "block";  /* Muestra el contenedor del gráfico de PSNR */

        const psnrCtx = document.getElementById("psnr-chart");  /* Obtiene el contexto del canvas para dibujar el gráfico de PSNR */

        new Chart(psnrCtx, {  /* Crea un nuevo gráfico de PSNR usando Chart.js */
            type: "line",  /* Tipo de gráfico: línea */
            data: {
                labels: data.psnr.per_frame.map((_, index) => index + 1),  /* Etiquetas para el eje x: número de frame */
                datasets: [{
                    label: "PSNR",
                    data: data.psnr.per_frame,  /* Datos para el eje y: valores de PSNR por frame */
                    borderColor: "red",
                    backgroundColor: "#BD4C33",
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,  /* Permite que el gráfico se ajuste al tamaño del contenedor */
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "frame"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "PSNR"
                        }
                    }
                }
            }
        });

    ssimResult.textContent = `SSIM
    global (all): ${data.ssim["global (all)"]}
    y: ${data.ssim.y}
    u: ${data.ssim.u}
    v: ${data.ssim.v}`;
    }
    
    catch (error) {
        console.error(error);
        vmafResult.textContent = "unable to connect to the server.";
    }
});