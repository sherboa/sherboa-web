const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");

const vmafResult = document.getElementById("vmaf-result");
const psnrResult = document.getElementById("psnr-result");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];
    const distortedVideo = document.getElementById("distorted-video").files[0];

    if (!referenceVideo || !distortedVideo) {
        vmafResult.textContent = "please select both videos.";
        return;
    }

    vmafResult.textContent = "analyzing...";

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
            vmafResult.textContent = data.detail || "analysis failed.";
            return;
        }

        vmafResult.textContent = `VMAF
        mean: ${data.vmaf.mean}
        min: ${data.vmaf.min}
        max: ${data.vmaf.max}`;

        vmafChartContainer.style.display = "block";

        const ctx = document.getElementById("vmaf-chart");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: data.vmaf.per_frame.map((_, index) => index + 1),
                datasets: [{
                    label: "VMAF",
                    data: data.vmaf.per_frame,
                    tension: 0.2
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


        psnrResult.textContent += `
        
        PSNR
        mean: ${data.psnr.mean}
        min: ${data.psnr.min}
        max: ${data.psnr.max}`;

        psnrChartContainer.style.display = "block";

        const psnrCtx = document.getElementById("psnr-chart");

        new Chart(psnrCtx, {
            type: "line",
            data: {
                labels: data.psnr.per_frame.map((_, index) => index + 1),
                datasets: [{
                    label: "PSNR",
                    data: data.psnr.per_frame,
                    borderColor: "red"
                    tension: 0.2
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
                            text: "PSNR"
                        }
                    }
                }
            }
        });

    }
    
    catch (error) {
        console.error(error);
        vmafResult.textContent = "unable to connect to the server.";
    }
});