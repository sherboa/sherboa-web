let vmafChart = null;  // Variable para almacenar la instancia del gráfico de VMAF
let psnrChart = null;  // Variable para almacenar la instancia del gráfico de PSNR
let ssimChart = null;  // Variable para almacenar la instancia del gráfico de VMAF

let latestPsnrPerFrame = [];

const vmafChartContainer = document.getElementById("vmaf-chart-container");  // Contenedor del gráfico de VMAF
const psnrChartContainer = document.getElementById("psnr-chart-container");  // Contenedor del gráfico de PSNR
const ssimChartContainer = document.getElementById("ssim-chart-container");  // Contenedor del gráfico de SSIM

//****************************************************************************************************************************
// CURVAS DE VMAF, PSNR Y SSIM POR FRAME
//****************************************************************************************************************************
export function updateCharts(data) {
    // VMAF
    vmafChartContainer.style.display = "block";

    const vmafCtx = document.getElementById("vmaf-chart");

    if (vmafChart === null) {
        vmafChart = new Chart(vmafCtx, {
            type: "line",
            data: {
                labels: data.vmaf.per_frame.map((_, index) => index + 1),
                datasets: [{
                    label: "VMAF",
                    data: data.vmaf.per_frame,
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
    } else {
        vmafChart.data.labels =
            data.vmaf.per_frame.map((_, index) => index + 1);
        vmafChart.data.datasets[0].data = data.vmaf.per_frame;
        vmafChart.update();
    }

    // PSNR
    latestPsnrPerFrame = data.psnr.per_frame;

    const psnrFiniteValues = data.psnr.per_frame.filter(
        value => typeof value === "number" && Number.isFinite(value)
    );

    const psnrChartData = data.psnr.per_frame.map(value =>
        value === "inf" ? null : value
    );

    const psnrChartMax = psnrFiniteValues.length > 0
        ? Math.max(...psnrFiniteValues)
        : 100;

    const psnrInfiniteMarkerY = psnrChartMax;

    psnrChartContainer.style.display = "block";

    const psnrCtx = document.getElementById("psnr-chart");

    if (psnrChart === null) {
        psnrChart = new Chart(psnrCtx, {
            type: "line",
            data: {
                labels: data.psnr.per_frame.map((_, index) => index + 1),
                datasets: [
                    {
                        label: "PSNR",
                        data: psnrChartData,
                        borderColor: "red",
                        backgroundColor: "#6e1406",
                        tension: 0.2,
                        spanGaps: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: "PSNR infinite",
                        data: data.psnr.per_frame.map(value =>
                            value === "inf" ? psnrInfiniteMarkerY : null
                        ),
                        showLine: false,
                        borderColor: "red",
                        backgroundColor: "#6e1406",
                        pointRadius: 4,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const originalValue =
                                    latestPsnrPerFrame[context.dataIndex];

                                if (originalValue === "inf") {
                                    return "PSNR: inf";
                                }

                                return `PSNR: ${originalValue} dB`;
                            }
                        }
                    },
                    legend: {
                        labels: {
                            filter: function(item) {
                                return item.text !== "PSNR infinite";
                            }
                        }
                    }
                }
            }
        });
    } else {
        psnrChart.data.labels =
            data.psnr.per_frame.map((_, index) => index + 1);

        psnrChart.data.datasets[0].data = psnrChartData;

        psnrChart.data.datasets[1].data =
            data.psnr.per_frame.map(value =>
                value === "inf" ? psnrInfiniteMarkerY : null
            );

        psnrChart.update();
    }

    // SSIM
    ssimChartContainer.style.display = "block";

    const ssimCtx = document.getElementById("ssim-chart");

    if (ssimChart === null) {
        ssimChart = new Chart(ssimCtx, {
            type: "line",
            data: {
                labels: data.ssim.per_frame.map((_, index) => index + 1),
                datasets: [{
                    label: "SSIM",
                    data: data.ssim.per_frame,
                    borderColor: "green",
                    backgroundColor: "#396117",
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                        }
                    }
                }
            }
        });
    } else {
        ssimChart.data.labels =
            data.ssim.per_frame.map((_, index) => index + 1);

        ssimChart.data.datasets[0].data = data.ssim.per_frame;
        ssimChart.update();
    }
}


//****************************************************************************************************************************
// DESCARGA DE GRAFICOS EN FORMATO PNG 
//****************************************************************************************************************************
function downloadChart(chart, filename) {  // Función para descargar el gráfico como imagen
    if (chart === null) {
        return;
    }

    const link = document.createElement("a");  // Crea un elemento <a> para descargar la imagen del gráfico 
    link.href = chart.toBase64Image("image/png");  // Obtiene la imagen del gráfico en formato base64
    link.download = filename;  // Establece el nombre del archivo a descargar
    link.click();
}

document.getElementById("download-vmaf-chart").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del gráfico de VMAF
    downloadChart(vmafChart, "sherboa-vmaf.png");
});

document.getElementById("download-psnr-chart").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del gráfico de PSNR
    downloadChart(psnrChart, "sherboa-psnr.png");
});

document.getElementById("download-ssim-chart").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del gráfico de SSIM
    downloadChart(ssimChart, "sherboa-ssim.png");
});
