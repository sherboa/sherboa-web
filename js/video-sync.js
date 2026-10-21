// Este modulo gestiona la previsualización y sincronización manual de los videos de referencia y distorsionado antes de ejecutar el análisis

const FALLBACK_FPS = 30;
const SEEK_THRESHOLD_SECONDS = 0.15;  // Diferencia mínima entre timestamps para actualizar currentTime; evita buscar constantemente en el video y reduce los saltos visuales

export function initVideoSync() {
    // ---------------------------------------------------------
    // 1. Obtener referencias a los elementos HTML.
    // ---------------------------------------------------------

    const referenceInput = document.getElementById("reference-video");
    const distortedInput = document.getElementById("distorted-video");

    const syncSection = document.getElementById("sync-section");

    const referencePreview = document.getElementById("reference-preview");
    const distortedPreview = document.getElementById("distorted-preview");

    const referenceTime = document.getElementById("reference-time");
    const distortedTime = document.getElementById("distorted-time");

    const offsetSlider = document.getElementById("sync-offset");
    const offsetValue = document.getElementById("sync-offset-value");
    const frameOffset = document.getElementById("sync-frame-offset");

    const frameBackButton = document.getElementById("sync-frame-back");
    const frameForwardButton = document.getElementById("sync-frame-forward");
    const resetButton = document.getElementById("sync-reset");

    // Si falta algún elemento esperado, se detiene la inicialización con un error claro
    const requiredElements = [
        referenceInput,
        distortedInput,
        syncSection,
        referencePreview,
        distortedPreview,
        referenceTime,
        distortedTime,
        offsetSlider,
        offsetValue,
        frameOffset,
        frameBackButton,
        frameForwardButton,
        resetButton
    ];

    if (requiredElements.some((element) => !element)) {
        console.error(
            "video-sync.js: faltan uno o más elementos HTML de sincronización."
        );

        return null;
    }

    // ---------------------------------------------------------
    // 2. Estado interno del módulo.
    // ---------------------------------------------------------

    // Offset expresado en segundos, con la siguiente convención:
    //   0      = sin desplazamiento
    //   +2.0   = mostrar el segundo 12 del distorsionadomcuando la referencia está en el segundo 10
    //   -2.0   = mostrar el segundo 8 del distorsionado cuando la referencia está en el segundo 10
    let syncOffset = 0;

    // Se guardan las URLs temporales creadas para las previsualizaciones: se deben revocarlas al reemplazar los archivos para liberar recursos
    let referenceObjectUrl = null;
    let distortedObjectUrl = null;

    // ---------------------------------------------------------
    // 3. Funciones auxiliares.
    // ---------------------------------------------------------

    // Convierte segundos en un timestamp legible, por ej:
    //   65.250  -> 01:05.250
    //   3665.5  -> 01:01:05.500
    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "--:--.---";
        }

        const totalMilliseconds = Math.floor(seconds * 1000);

        const hours = Math.floor(totalMilliseconds / 3_600_000);
        const minutes = Math.floor(
            (totalMilliseconds % 3_600_000) / 60_000
        );
        const secs = Math.floor(
            (totalMilliseconds % 60_000) / 1000
        );
        const milliseconds = totalMilliseconds % 1000;

        const paddedMinutes = String(minutes).padStart(2, "0");
        const paddedSeconds = String(secs).padStart(2, "0");
        const paddedMilliseconds = String(milliseconds).padStart(3, "0");

        if (hours > 0) {
            return (
                `${String(hours).padStart(2, "0")}:` +
                `${paddedMinutes}:${paddedSeconds}.` +
                paddedMilliseconds
            );
        }

        return (
            `${paddedMinutes}:${paddedSeconds}.` +
            paddedMilliseconds
        );
    }

    // Mantiene el offset dentro de los límites admitidos por el slider; el rango se calculará según las duraciones reales de ambos videos
    function clampOffset(value) {
        const minimum = Number(offsetSlider.min);
        const maximum = Number(offsetSlider.max);

        return Math.min(maximum, Math.max(minimum, value));
    }

    function videosReady() {  // Indica si ambos videos están cargados y tienen duración conocida
        return (
            Number.isFinite(referencePreview.duration) &&
            referencePreview.duration > 0 &&
            Number.isFinite(distortedPreview.duration) &&
            distortedPreview.duration > 0
        );
    }

    // ---------------------------------------------------------
    // 4. Actualizar los indicadores de la interfaz.
    // ---------------------------------------------------------

    // Actualiza el valor visible del offset y su equivalente aproximado en frames
    // La equivalencia en frames es provisional hasta que se integre los FPS reales obtenidos por ffprobe
    function updateOffsetDisplay() {
        const sign = syncOffset > 0 ? "+" : "";

        offsetValue.textContent = `${sign}${syncOffset.toFixed(3)} s`;

        const approximateFrames = Math.round(syncOffset * FALLBACK_FPS);

        frameOffset.textContent =
            `(~${approximateFrames} frames at ${FALLBACK_FPS} fps)`;
    }

    function updateControls() {  // Habilita o deshabilita los controles según el estado de los videos
        const ready = videosReady();

        offsetSlider.disabled = !ready;
        frameBackButton.disabled = !ready;
        frameForwardButton.disabled = !ready;
        resetButton.disabled = !ready;
    }

    // ---------------------------------------------------------
    // 5. Sincronización de la previsualización.
    // ---------------------------------------------------------

    // Mueve la previsualización distorsionada al timestamp equivalente al tiempo actual de la referencia más el offset seleccionado
    // Si el timestamp calculado queda fuera de la duración del distorsionado, se informa en pantalla y no se fuerza una búsqueda inválida
    function syncDistortedPreview() {
        if (!videosReady()) {
            return;
        }

        const targetTime = referencePreview.currentTime + syncOffset;
        const distortedDuration = distortedPreview.duration;

        if (targetTime < 0 || targetTime > distortedDuration) {  // El offset puede hacer que no exista un frame correspondiente en el video distorsionado para este instante de referencia
            distortedTime.textContent = "out of range";
            return;
        }

        const difference = Math.abs(  // Se evita asignar currentTime en cada evento si los videos ya están suficientemente cerca del mismo instante
            distortedPreview.currentTime - targetTime
        );

        if (difference > SEEK_THRESHOLD_SECONDS) {
            distortedPreview.currentTime = targetTime;
        }

        distortedTime.textContent = formatTime(targetTime);
    }

    function updateReferencePreview() {  // Actualiza el timestamp visible de la referencia y sincroniza la previsualización distorsionada
        referenceTime.textContent = formatTime(
            referencePreview.currentTime
        );

        syncDistortedPreview();
    }

    // ---------------------------------------------------------
    // 6. Gestión de los archivos seleccionados.
    // ---------------------------------------------------------

    // Carga un archivo local en su elemento de previsualización
    // URL.createObjectURL permite reproducir el archivo local sin subirlo a sherboa ni generar tráfico hacia la API
    function loadPreview(input, video, side) {
        const file = input.files?.[0];

        if (side === "reference" && referenceObjectUrl) {  // Si ya existía una URL temporal, la liberamos antes de reemplazar el archivo
            URL.revokeObjectURL(referenceObjectUrl);
            referenceObjectUrl = null;
        }

        if (side === "distorted" && distortedObjectUrl) {
            URL.revokeObjectURL(distortedObjectUrl);
            distortedObjectUrl = null;
        }

        if (!file) {  // Si el usuario quitó el archivo, limpiamos la previsualización
            video.pause();
            video.removeAttribute("src");
            video.load();
            return;
        }

        const objectUrl = URL.createObjectURL(file);  // Se crea una URL temporal para reproducir el archivo local

        if (side === "reference") {
            referenceObjectUrl = objectUrl;
        } else {
            distortedObjectUrl = objectUrl;
        }

        video.src = objectUrl;
        video.load();
    }

    function updateSectionVisibility() {  // Muestra la sección de sincronización únicamente cuando se seleccionaron los dos archivos
        const bothFilesSelected = Boolean(
            referenceInput.files?.[0] &&
            distortedInput.files?.[0]
        );

        syncSection.hidden = !bothFilesSelected;
    }

    // Recalcula el rango permitido para el offset
    // La fórmula es: tiempo_distorsionado = tiempo_referencia + offset
    // Por eso, como rango global de offsets:
    //    mínimo = -duración de la referencia
    //    máximo = duración del distorsionado
    // Esto permite ajustar videos de distinta duración sin límites fijos arbitrarios
    function updateOffsetBounds() {
        if (!videosReady()) {
            updateControls();
            return;
        }

        offsetSlider.min = String(-referencePreview.duration);
        offsetSlider.max = String(distortedPreview.duration);
        offsetSlider.step = "0.001";

        // Si cambió alguno de los archivos, el offset anterior podría quedar fuera del nuevo rango -> en ese caso se ajusta
        syncOffset = clampOffset(syncOffset);
        offsetSlider.value = String(syncOffset);

        updateOffsetDisplay();
        updateControls();
        updateReferencePreview();
    }

    function handleFileSelection() {  // Carga las previsualizaciones cuando se elige un archivo nuevo
        loadPreview(
            referenceInput,
            referencePreview,
            "reference"
        );

        loadPreview(
            distortedInput,
            distortedPreview,
            "distorted"
        );

        syncOffset = 0;  // Cada nueva pareja de archivos comienza sin desplazamiento
        offsetSlider.value = "0";

        updateOffsetDisplay();
        updateSectionVisibility();
        updateControls();
    }

    // ---------------------------------------------------------
    // 7. Modificación del offset.
    // ---------------------------------------------------------

    // Cambia el offset y actualiza la interfaz: esta función centraliza las modificaciones realizadas mediante el slider, los botones de frames o el botón de reinicio
    function setOffset(newOffset) {
        if (!Number.isFinite(newOffset)) {
            return;
        }

        syncOffset = clampOffset(newOffset);

        offsetSlider.value = String(syncOffset);

        updateOffsetDisplay();
        syncDistortedPreview();
    }

    // Desplaza el offset una cantidad equivalente a un frame
    // ATENCIÓN: Por ahora es una aproximación a 30 FPS; la precisión real por frame se implementará cuando se integre los FPS de ffprobe
    function adjustByOneFrame(direction) {
        const frameDuration = 1 / FALLBACK_FPS;

        setOffset(syncOffset + direction * frameDuration);
    }

    function resetOffset() {  // Restablece el desplazamiento temporal a cero
        setOffset(0);
    }

    // ---------------------------------------------------------
    // 8. Conectar los eventos de la interfaz.
    // ---------------------------------------------------------

    // Cambios en los archivos seleccionados
    referenceInput.addEventListener("change", handleFileSelection);
    distortedInput.addEventListener("change", handleFileSelection);

    offsetSlider.addEventListener("input", () => {  // El slider actualiza el offset mientras el usuario lo arrastra
        setOffset(Number(offsetSlider.value));
    });

    frameBackButton.addEventListener("click", () => {  // Botones de ajuste fino
        adjustByOneFrame(-1);
    });

    frameForwardButton.addEventListener("click", () => {
        adjustByOneFrame(1);
    });

    resetButton.addEventListener("click", resetOffset);  // Botón de reinicio

    // La referencia es el reloj maestro de la previsualización: al buscar o reproducir la referencia, el distorsionado la sigue
    referencePreview.addEventListener(
        "timeupdate",
        updateReferencePreview
    );

    referencePreview.addEventListener(
        "seeking",
        updateReferencePreview
    );

    referencePreview.addEventListener(
        "seeked",
        updateReferencePreview
    );

    // Se espera a conocer las duraciones antes de habilitar los controles
    referencePreview.addEventListener(
        "loadedmetadata",
        updateOffsetBounds
    );

    distortedPreview.addEventListener(
        "loadedmetadata",
        updateOffsetBounds
    );

    // Algunos archivos pueden reportar un cambio de duración al terminar de cargar sus metadatos
    referencePreview.addEventListener(
        "durationchange",
        updateOffsetBounds
    );

    distortedPreview.addEventListener(
        "durationchange",
        updateOffsetBounds
    );

    // ---------------------------------------------------------
    // 9. Estado inicial.
    // ---------------------------------------------------------

    // La sección no aparece hasta que se seleccionan ambos archivos
    syncSection.hidden = true;

    updateOffsetDisplay();
    updateControls();

    // ---------------------------------------------------------
    // 10. Interfaz pública del módulo.
    // ---------------------------------------------------------

    // analyze-video.js podrá consultar el offset actual sin acceder directamente a las variables internas de este módulo
    return {
        getOffset() {
            return syncOffset;
        },

        reset() {
            resetOffset();
        }
    };
}
