// Este módulo gestiona la sincronización manual de los videos de referencia y distorsionado mediante miniaturas generadas por la API de Sherboa.

const FALLBACK_FPS = 30; // Valor de respaldo si no se dispone de los FPS reales obtenidos por ffprobe

export function initVideoSync({ onChange } = {}) {
    // ---------------------------------------------------------
    // 1. Obtener referencias a los elementos HTML.
    // ---------------------------------------------------------

    const referenceInput = document.getElementById("reference-video");
    const distortedInput = document.getElementById("distorted-video");

    const syncSection = document.getElementById("sync-section");

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
    //   +2.0   = mostrar el segundo 12 del distorsionado cuando la referencia está en el segundo 10
    //   -2.0   = mostrar el segundo 8 del distorsionado cuando la referencia está en el segundo 10
    let syncOffset = 0;

    // Duraciones de ambos videos obtenidas de los metadatos devueltos por la API
    let referenceDuration = null;
    let distortedDuration = null;

    // FPS de la referencia, obtenidos mediante ffprobe
    let fps = FALLBACK_FPS;

    // Timestamp seleccionado en la referencia, por ejemplo mediante un clic en cualquiera de los gráficos
    let selectedReferenceTime = 0;

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

    // Mantiene el offset dentro de los límites admitidos por el slider; el rango se calcula según las duraciones reales de ambos videos
    function clampOffset(value) {
        const minimum = Number(offsetSlider.min);
        const maximum = Number(offsetSlider.max);

        return Math.min(maximum, Math.max(minimum, value));
    }

    // Indica si se conocen las duraciones válidas de ambos videos.
    function videosReady() {
        return (
            Number.isFinite(referenceDuration) &&
            referenceDuration > 0 &&
            Number.isFinite(distortedDuration) &&
            distortedDuration > 0
        );
    }

    // Calcula el timestamp correspondiente en el video distorsionado, usando la fórmula: tiempo_distorsionado = tiempo_referencia + offset
    function getDistortedTime() {
        return selectedReferenceTime + syncOffset;
    }

    // ---------------------------------------------------------
    // 4. Actualizar los indicadores de la interfaz.
    // ---------------------------------------------------------

    // Actualiza el valor visible del offset y su equivalente aproximado en frames; la equivalencia utiliza los FPS de la referencia cuando están disponibles
    function updateOffsetDisplay() {
        const sign = syncOffset > 0 ? "+" : "";

        offsetValue.textContent = `${sign}${syncOffset.toFixed(3)} s`;

        const approximateFrames = Math.round(syncOffset * fps);
        const frameSign = approximateFrames > 0 ? "+" : "";

        frameOffset.textContent =
            `(~${frameSign}${approximateFrames} frames at ${fps} fps)`;
    }

    // Habilita o deshabilita los controles según la disponibilidad de los metadatos.
    function updateControls() {
        const ready = videosReady();

        offsetSlider.disabled = !ready;
        frameBackButton.disabled = !ready;
        frameForwardButton.disabled = !ready;
        resetButton.disabled = !ready;
    }

    // Actualiza los timestamps visibles y notifica a analyze-video.js para que actualice las miniaturas
    function notifyChange() {
        const distortedTimestamp = getDistortedTime();

        const distortedInRange =
            videosReady() &&
            distortedTimestamp >= 0 &&
            distortedTimestamp < distortedDuration;

        referenceTime.textContent = formatTime(selectedReferenceTime);

        distortedTime.textContent = distortedInRange
            ? formatTime(distortedTimestamp)
            : "out of range";

        if (typeof onChange === "function") {
            onChange({
                referenceTime: selectedReferenceTime,
                distortedTime: distortedTimestamp,
                offset: syncOffset,
                distortedInRange
            });
        }
    }

    // ---------------------------------------------------------
    // 5. Sincronización de las miniaturas.
    // ---------------------------------------------------------

    // Notifica el timestamp correspondiente a cada video; si el timestamp distorsionado queda fuera de su duración, se informa en pantalla y se evita solicitar una miniatura para un instante inválido
    function updatePreview() {
        updateOffsetDisplay();
        notifyChange();
    }

    // ---------------------------------------------------------
    // 6. Gestión de los archivos seleccionados.
    // ---------------------------------------------------------

    // Muestra la sección de sincronización únicamente cuando se seleccionaron los dos archivos
    function updateSectionVisibility() {
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

        offsetSlider.min = String(-referenceDuration);
        offsetSlider.max = String(distortedDuration);
        offsetSlider.step = String(1 / fps);

        // Si cambió alguno de los archivos, el offset anterior podría quedar fuera del nuevo rango; en ese caso, se ajusta al límite permitido
        syncOffset = clampOffset(syncOffset);
        offsetSlider.value = String(syncOffset);

        updatePreview();
        updateControls();
    }

    // Recibe los metadatos de ambos videos devueltos por la API; no se necesita reproducir los archivos en el navegador
    function setVideoMetadata({
        referenceDuration: newReferenceDuration,
        distortedDuration: newDistortedDuration,
        fps: newFps
    }) {
        referenceDuration = Number(newReferenceDuration);
        distortedDuration = Number(newDistortedDuration);

        fps =
            Number.isFinite(Number(newFps)) && Number(newFps) > 0
                ? Number(newFps)
                : FALLBACK_FPS;

        // Mantiene el timestamp de referencia dentro de su duración
        if (Number.isFinite(referenceDuration) && referenceDuration > 0) {
            selectedReferenceTime = Math.min(
                selectedReferenceTime,
                Math.max(0, referenceDuration - 0.001)
            );
        }

        updateOffsetBounds();
    }

    // Limpia el estado de sincronización cuando se seleccionan otros archivos o comienza un nuevo análisis
    function clearMetadata() {
        referenceDuration = null;
        distortedDuration = null;
        selectedReferenceTime = 0;
        syncOffset = 0;
        fps = FALLBACK_FPS;

        offsetSlider.min = "0";
        offsetSlider.max = "0";
        offsetSlider.value = "0";

        offsetValue.textContent = "0.000 s";
        frameOffset.textContent = "";

        referenceTime.textContent = "00:00.000";
        distortedTime.textContent = "00:00.000";

        updateControls();

        if (typeof onChange === "function") {
            onChange(null);
        }
    }

    // ---------------------------------------------------------
    // 7. Modificación del offset.
    // ---------------------------------------------------------

    // Cambia el offset y actualiza la interfaz
    // Esta función centraliza las modificaciones realizadas mediante el slider, los botones de frames o el botón de reinicio
    function setOffset(newOffset) {
        if (!Number.isFinite(newOffset) || !videosReady()) {
            return;
        }

        syncOffset = clampOffset(newOffset);
        offsetSlider.value = String(syncOffset);

        updatePreview();
    }

    // Desplaza el offset una cantidad equivalente a un frame; utiliza los FPS reales de la referencia cuando están disponibles
    function adjustByOneFrame(direction) {
        const frameDuration = 1 / fps;

        setOffset(syncOffset + direction * frameDuration);
    }

    // Restablece el desplazamiento temporal a cero
    function resetOffset() {
        setOffset(0);
    }

    // Actualiza el timestamp de referencia cuando el usuario selecciona un frame en un gráfico
    function setReferenceTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return;
        }

        selectedReferenceTime = videosReady()
            ? Math.min(
                Math.max(0, seconds),
                Math.max(0, referenceDuration - 0.001)
            )
            : Math.max(0, seconds);

        notifyChange();
    }

    // ---------------------------------------------------------
    // 8. Conectar los eventos de la interfaz.
    // ---------------------------------------------------------

    // Cambios en los archivos seleccionados; al cambiar cualquiera de ellos, se invalidan los metadatos del análisis anterior
    referenceInput.addEventListener("change", () => {
        clearMetadata();
        updateSectionVisibility();
    });

    distortedInput.addEventListener("change", () => {
        clearMetadata();
        updateSectionVisibility();
    });

    // El slider actualiza el offset mientras el usuario lo arrastra
    offsetSlider.addEventListener("input", () => {
        setOffset(Number(offsetSlider.value));
    });

    // Botones de ajuste fino
    frameBackButton.addEventListener("click", () => {
        adjustByOneFrame(-1);
    });

    frameForwardButton.addEventListener("click", () => {
        adjustByOneFrame(1);
    });

    resetButton.addEventListener("click", resetOffset);  // Botón de reinicio

    // ---------------------------------------------------------
    // 9. Estado inicial.
    // ---------------------------------------------------------

    // La sección no aparece hasta que se seleccionan ambos archivos.
    syncSection.hidden = true;

    updateOffsetDisplay();
    updateControls();

    // ---------------------------------------------------------
    // 10. Interfaz pública del módulo.
    // ---------------------------------------------------------

    // analyze-video.js puede actualizar los metadatos y el timestamp seleccionado, consultar el offset actual y restablecer el estado sin acceder directamente a las variables internas de este módulo
    return {
        setVideoMetadata,
        setReferenceTime,
        clearMetadata,

        getOffset() {
            return syncOffset;
        },

        reset() {
            resetOffset();
        }
    };
}
