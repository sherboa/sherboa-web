const API_URL = "https://sherboa-api.duckdns.org";

const form = document.getElementById("vmaf-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const referenceVideo = document.getElementById("reference-video").files[0];
    const distortedVideo = document.getElementById("distorted-video").files[0];

    if (!referenceVideo || !distortedVideo) {
        result.textContent = "please select both videos.";
        return;
    }

    result.textContent = "analyzing...";

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
            result.textContent = data.detail || "analysis failed.";
            return;
        }

        result.textContent = `vmaf score: ${data.vmaf}`;
    } catch (error) {
        console.error(error);
        result.textContent = "unable to connect to the server.";
    }
});