let lastAnalysisData = null;

export function setAnalysisData(data) {
    lastAnalysisData = data;
}


//****************************************************************************************************************************
// DESCARGA DE ARCHIVO DE DATOS EN FORMATO JSON
//****************************************************************************************************************************
function downloadFile(content, filename, mimeType) {  // Función para descargar un archivo con el contenido especificado
    const blob = new Blob([content], { type: mimeType });  // Crea un objeto Blob con el contenido y el tipo MIME especificado
    const url = URL.createObjectURL(blob);  // Crea una URL temporal para el objeto Blob

    const link = document.createElement("a");  // Crea un elemento <a> para descargar el archivo
    link.href = url;  // Establece la URL del objeto Blob como el href del enlace 
    link.download = filename;  // Establece el nombre del archivo a descargar 
    link.click();  // Simula un clic en el enlace para iniciar la descarga del archivo 

    URL.revokeObjectURL(url);  // Revoca la URL temporal para liberar memoria 
}

document.getElementById("download-json").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del archivo JSON 
    if (lastAnalysisData === null) {
        return;
    }

    const json = JSON.stringify(lastAnalysisData, null, 2);  // Convierte los datos del último análisis a formato JSON con una sangría de 2 espacios 

    downloadFile(  // Llama a la función para descargar el archivo JSON 
        json,
        "sherboa-analysis.json",
        "application/json"
    );
});



//****************************************************************************************************************************
// DESCARGA DE ARCHIVO DE DATOS EN FORMATO CSV
//****************************************************************************************************************************
document.getElementById("download-csv").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del archivo CSV 
    if (lastAnalysisData === null) {
        return;
    }

    const rows = [  // Arreglo para almacenar las filas del archivo CSV 
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

    for (const [metric, values] of [  // Itera sobre los valores de VMAF, PSNR y SSIM por frame
        ["vmaf", lastAnalysisData.vmaf.per_frame],
        ["psnr", lastAnalysisData.psnr.per_frame],
        ["ssim", lastAnalysisData.ssim.per_frame]
    ]) {
        values.forEach((value, index) => {  // Itera sobre cada valor por frame y agrega una fila al arreglo de filas
            rows.push(["per_frame", metric, index + 1, value]);
        });
    }

    const csv = rows  // Convierte el arreglo de filas a formato CSV
        .map(row =>  // Itera sobre cada fila y convierte los valores a texto escapando comillas dobles
            row.map(value => {
                const text = String(value ?? "");
                return `"${text.replace(/"/g, '""')}"`;
            }).join(",")
        )
        .join("\r\n");

    downloadFile(  // Llama a la función para descargar el archivo CSV
        "\uFEFF" + csv,  // Agrega un BOM (Byte Order Mark) al inicio del archivo CSV para asegurar la correcta codificación de caracteres
        "sherboa-analysis.csv",
        "text/csv;charset=utf-8"
    );
});



//****************************************************************************************************************************
// DESCARGA DE ARCHIVO DE DATOS EN FORMATO XML
//****************************************************************************************************************************
document.getElementById("download-xml").addEventListener("click", () => {  // Agrega un evento de clic al botón de descarga del archivo XML 
    if (lastAnalysisData === null) {  // Verifica si hay datos del último análisis antes de generar el archivo XML 
        return;
    }

    const data = lastAnalysisData;  // Variable para almacenar los datos del último análisis realizado 

    const escapeXml = (value) =>  // Función para escapar caracteres especiales en XML 
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

    downloadFile(  // Llama a la función para descargar el archivo XML 
        xml,
        "sherboa-analysis.xml",
        "application/xml;charset=utf-8"
    );
});
