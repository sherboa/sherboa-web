const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");

const vmafResult = document.getElementById("vmaf-result");  /* Elemento para mostrar los resultados de VMAF */
const psnrResult = document.getElementById("psnr-result");  /* Elemento para mostrar los resultados de PSNR */
const ssimResult = document.getElementById("ssim-result");  /* Elemento para mostrar los resultados de SSIM */
const vmafChartContainer = document.getElementById("vmaf-chart-container");  /* Contenedor del gráfico de VMAF */
const psnrChartContainer = document.getElementById("psnr-chart-container");  /* Contenedor del gráfico de PSNR */
const ssimChartContainer = document.getElementById("ssim-chart-container");  /* Contenedor del gráfico de SSIM */

let vmafChart = null;  /* Variable para almacenar la instancia del gráfico de VMAF */
let psnrChart = null;  /* Variable para almacenar la instancia del gráfico de PSNR */
let ssimChart = null;  /* Variable para almacenar la instancia del gráfico de SSIM */
let lastAnalysisData = null;  /* Variable para almacenar los datos del último análisis realizado */


form.addEventListener("submit", async (event) => {  /* Maneja el evento de envío del formulario */
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];  /* Obtiene el archivo de video de referencia */
    const distortedVideo = document.getElementById("distorted-video").files[0];  /* Obtiene el archivo de video distorsionado */

    if (!referenceVideo || !distortedVideo) {  /* Verifica si ambos archivos de video están seleccionados */
        vmafResult.textContent = "please select both videos.";
        return;
    }

    vmafResult.textContent = "analyzing, please wait...";
    vmafResult.classList.add("analyzing");

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

        lastAnalysisData = data;
        document.getElementById("download-vmaf-chart").hidden = false;  /* Muestra el botón de descarga del gráfico de VMAF */
        document.getElementById("download-psnr-chart").hidden = false;  /* Muestra el botón de descarga del gráfico de PSNR */
        document.getElementById("download-ssim-chart").hidden = false;  /* Muestra el botón de descarga del gráfico de SSIM */
        document.getElementById("download-data-container").hidden = false;  /* Muestra el contenedor del botón de descarga de datos */


        vmafResult.textContent = `VMAF [%]
        mean: ${data.vmaf.mean}
        min: ${data.vmaf.min}
        max: ${data.vmaf.max}`;

        vmafChartContainer.style.display = "block";  /* Muestra el contenedor del gráfico de VMAF */

        const ctx = document.getElementById("vmaf-chart");  /* Obtiene el contexto del canvas para dibujar el gráfico de VMAF */


        if (vmafChart === null) {
            vmafChart = new Chart(ctx, {    /* Crea un nuevo gráfico de VMAF usando Chart.js */
                type: "line",  /* Tipo de gráfico: línea */
                data: {
                    labels: data.vmaf.per_frame.map((_, index) => index + 1),  /* Etiquetas para el eje x: número de frame */
                    datasets: [{
                        label: "VMAF",
                        data: data.vmaf.per_frame,  /* Datos para el eje y: valores de VMAF por frame */
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
                                text: "VMAF [%]"
                            }
                        }
                    }
                }
            });
        } else {
            vmafChart.data.labels = data.vmaf.per_frame.map((_, index) => index + 1);
            vmafChart.data.datasets[0].data = data.vmaf.per_frame;
            vmafChart.update();
        }


        psnrResult.textContent = `PSNR [dB]
        mean: ${data.psnr.mean}
        min: ${data.psnr.min}
        max: ${data.psnr.max}`;

        psnrChartContainer.style.display = "block";  /* Muestra el contenedor del gráfico de PSNR */

        const psnrCtx = document.getElementById("psnr-chart");  /* Obtiene el contexto del canvas para dibujar el gráfico de PSNR */

        if (psnrChart === null) {
            psnrChart = new Chart(psnrCtx, {  /* Crea un nuevo gráfico de PSNR usando Chart.js */
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
                                text: "PSNR [dB]"
                            }
                        }
                    }
                }
            });
            } else {
                psnrChart.data.labels = data.psnr.per_frame.map((_, index) => index + 1);
                psnrChart.data.datasets[0].data = data.psnr.per_frame;
                psnrChart.update();
            }

        ssimResult.textContent = `SSIM
        global (all): ${data.ssim["global (all)"]}
        y: ${data.ssim.y}
        u: ${data.ssim.u}
        v: ${data.ssim.v}`;

        
        ssimChartContainer.style.display = "block";

        const ssimCtx = document.getElementById("ssim-chart");

        if (ssimChart === null) {
            ssimChart = new Chart(ssimCtx, {  /* Crea un nuevo gráfico de SSIM usando Chart.js */
                type: "line",  /* Tipo de gráfico: línea */
                data: {
                    labels: data.ssim.per_frame.map((_, index) => index + 1),  /* Etiquetas para el eje x: número de frame */
                    datasets: [{
                        label: "SSIM",
                        data: data.ssim.per_frame,  /* Datos para el eje y: valores de SSIM por frame */
                        borderColor: "green",
                        backgroundColor: "#396117",
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
                                text: "SSIM"
                            },
                        }
                    }
                }
            });
            } else {
                ssimChart.data.labels = data.ssim.per_frame.map((_, index) => index + 1);
                ssimChart.data.datasets[0].data = data.ssim.per_frame;
                ssimChart.update();
            }
        
        }catch (error) {
            console.error(error);
            vmafResult.textContent = "unable to connect to the server.";
        } finally {
            vmafResult.classList.remove("analyzing");
        }
});



/*****************************************************************************************************************************/
/* DESCARGA DE GRAFICOS EN FORMATO PNG ***************************************************************************************/
function downloadChart(chart, filename) {  /* Función para descargar el gráfico como imagen */
    if (chart === null) {
        return;
    }

    const link = document.createElement("a");  /* Crea un elemento <a> para descargar la imagen del gráfico */
    link.href = chart.toBase64Image("image/png");  /* Obtiene la imagen del gráfico en formato base64 */
    link.download = filename;  /* Establece el nombre del archivo a descargar */
    link.click();
}

document.getElementById("download-vmaf-chart").addEventListener("click", () => {  /* Agrega un evento de clic al botón de descarga del gráfico de VMAF */
    downloadChart(vmafChart, "sherboa-vmaf.png");
});

document.getElementById("download-psnr-chart").addEventListener("click", () => {  /* Agrega un evento de clic al botón de descarga del gráfico de PSNR */
    downloadChart(psnrChart, "sherboa-psnr.png");
});

document.getElementById("download-ssim-chart").addEventListener("click", () => {  /* Agrega un evento de clic al botón de descarga del gráfico de SSIM */
    downloadChart(ssimChart, "sherboa-ssim.png");
});
/*****************************************************************************************************************************/



/*****************************************************************************************************************************/
/* DESCARGA DE ARCHIVO DE DATOS EN FORMATO JSON ******************************************************************************/
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

document.getElementById("download-json").addEventListener("click", () => {
    if (lastAnalysisData === null) {
        return;
    }

    const json = JSON.stringify(lastAnalysisData, null, 2);

    downloadFile(
        json,
        "sherboa-analysis.json",
        "application/json"
    );
});
/*****************************************************************************************************************************/



/*****************************************************************************************************************************/
/* DESCARGA DE ARCHIVO DE DATOS EN FORMATO CSV ******************************************************************************/
document.getElementById("download-csv").addEventListener("click", () => {
    if (lastAnalysisData === null) {
        return;
    }

    const rows = [
        ["section", "metric", "frame", "value"],
        ["summary", "vmaf_mean", "", lastAnalysisData.vmaf.mean],
        ["summary", "vmaf_min", "", lastAnalysisData.vmaf.min],
        ["summary", "vmaf_max", "", lastAnalysisData.vmaf.max],
        ["summary", "psnr_mean", "", lastAnalysisData.psnr.mean],
        ["summary", "psnr_min", "", lastAnalysisData.psnr.min],
        ["summary", "psnr_max", "", lastAnalysisData.psnr.max],
        ["summary", "ssim_global", "", lastAnalysisData.ssim["global (all)"]],
        ["summary", "ssim_y", "", lastAnalysisData.ssim.y],
        ["summary", "ssim_u", "", lastAnalysisData.ssim.u],
        ["summary", "ssim_v", "", lastAnalysisData.ssim.v]
    ];

    for (const [metric, values] of [
        ["vmaf", lastAnalysisData.vmaf.per_frame],
        ["psnr", lastAnalysisData.psnr.per_frame],
        ["ssim", lastAnalysisData.ssim.per_frame]
    ]) {
        values.forEach((value, index) => {
            rows.push(["per_frame", metric, index + 1, value]);
        });
    }

    const csv = rows
        .map(row =>
            row.map(value => {
                const text = String(value ?? "");
                return `"${text.replace(/"/g, '""')}"`;
            }).join(",")
        )
        .join("\r\n");

    downloadFile(
        "\uFEFF" + csv,
        "sherboa-analysis.csv",
        "text/csv;charset=utf-8"
    );
});
/*****************************************************************************************************************************/



/*****************************************************************************************************************************/
/* DESCARGA DE ARCHIVO DE DATOS EN FORMATO XML ******************************************************************************/
document.getElementById("download-xml").addEventListener("click", () => {
    if (lastAnalysisData === null) {
        return;
    }

    const data = lastAnalysisData;

    const escapeXml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const metricXml = (name, metric) => `
        <${name}>
            <mean>${escapeXml(metric.mean)}</mean>
            <min>${escapeXml(metric.min)}</min>
            <max>${escapeXml(metric.max)}</max>
            <per_frame>
                ${metric.per_frame.map((value, index) => `
                    <frame number="${index + 1}">${escapeXml(value)}</frame>
                `).join("")}
            </per_frame>
        </${name}>`;

    const ssimFrames = data.ssim.per_frame.map((value, index) => `
        <frame number="${index + 1}">${escapeXml(value)}</frame>
    `).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sherboa_analysis>
    <vmaf>
        ${metricXml("score", data.vmaf)}
    </vmaf>
    <psnr>
        ${metricXml("score", data.psnr)}
    </psnr>
    <ssim>
        <global>${escapeXml(data.ssim["global (all)"])}</global>
        <y>${escapeXml(data.ssim.y)}</y>
        <u>${escapeXml(data.ssim.u)}</u>
        <v>${escapeXml(data.ssim.v)}</v>
        <per_frame>
            ${ssimFrames}
        </per_frame>
    </ssim>
</sherboa_analysis>`;

    downloadFile(
        xml,
        "sherboa-analysis.xml",
        "application/xml;charset=utf-8"
    );
});
/*****************************************************************************************************************************/