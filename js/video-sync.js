// Este módulo gestiona la sincronización manual de los videos de referencia y distorsionado mediante miniaturas generadas por la API de Sherboa.

const FALLBACK_FPS = 30; // Valor de respaldo si no se dispone de los FPS reales obtenidos por ffprobe

export function initVideoSync({ onChange } = {}) {
    // ---------------------------------------------------------
    // 1. Obtener referencias a los elementos HTML.
    // ---------------------------------------------------------

    const referenceInput = document.getElementById("reference-video");
    const distortedInput = document.getElementById("distorted-video");

    const referenceAdjusting = document.getElementById("reference-adjusting");
    const distortedAdjusting = document.getElementById("distorted-adjusting");

    const syncSection = document.getElementById("sync-section");

    const referenceTime = document.getElementById("reference-time");
    const distortedTime = document.getElementById("distorted-time");

    const offsetSlider = document.getElementById("sync-offset");
    const offsetValue = document.getElementById("sync-offset-value");
    const frameOffset = document.getElementById("sync-frame-offset");

    const frameBackButton = document.getElementById("sync-frame-back");
    const frameForwardButton = document.getElementById("sync-frame-forward");
    const resetButton = document.getElementById("sync-reset");

    const requiredElements = [  // Si falta algún elemento esperado, se detiene la inicialización con un error claro
        referenceInput,
        distortedInput,
        referenceAdjusting,
        distortedAdjusting,
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

    let fps = FALLBACK_FPS;  // FPS de la referencia, obtenidos mediante ffprobe

    let selectedReferenceTime = 0;  // Timestamp seleccionado en la referencia, por ejemplo mediante un clic en cualquiera de los gráficos

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

        if (hours > 0) {  // Si hay horas, se muestra el formato completo HH:MM:SS.mmm
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

    function clampOffset(value) {  // Mantiene el offset dentro de los límites admitidos por el slider; el rango se calcula según las duraciones reales de ambos videos
        const minimum = Number(offsetSlider.min);
        const maximum = Number(offsetSlider.max);

        return Math.min(maximum, Math.max(minimum, value));
    }

    function videosReady() {  // Indica si se conocen las duraciones válidas de ambos videos
        return (
            Number.isFinite(referenceDuration) &&
            referenceDuration > 0 &&
            Number.isFinite(distortedDuration) &&
            distortedDuration > 0
        );
    }

    function getDistortedTime() {  // Calcula el timestamp correspondiente en el video distorsionado, usando la fórmula: tiempo_distorsionado = tiempo_referencia + offset
        return selectedReferenceTime + syncOffset;
    }

    // ---------------------------------------------------------
    // 4. Actualizar los indicadores de la interfaz.
    // ---------------------------------------------------------

    function updateOffsetDisplay() {  // Actualiza el valor visible del offset y su equivalente aproximado en frames; la equivalencia utiliza los FPS de la referencia cuando están disponibles
        const sign = syncOffset > 0 ? "+" : "";

        offsetValue.textContent = `${sign}${syncOffset.toFixed(3)} s`;

        const approximateFrames = Math.round(syncOffset * fps);
        const frameSign = approximateFrames > 0 ? "+" : "";

        frameOffset.textContent =
            `(~${frameSign}${approximateFrames} frames at ${fps} fps)`;
        offsetSlider.value = String(syncOffset);
        updateSyncIndicators();
    }

    function updateSyncIndicators() {  // Indica qué video permanece fijo y cuál se está desplazando durante el ajuste
        if (syncOffset > 0) {
            referenceAdjusting.textContent = "Fixed";
            distortedAdjusting.textContent = "Adjusting";
        } else if (syncOffset < 0) {
            referenceAdjusting.textContent = "Adjusting";
            distortedAdjusting.textContent = "Fixed";
        } else {
            referenceAdjusting.textContent = "Aligned";
            distortedAdjusting.textContent = "Aligned";
        }
    }

    function updateControls() {  // Habilita o deshabilita los controles según la disponibilidad de los metadatos
        const ready = videosReady();

        offsetSlider.disabled = !ready;
        resetButton.disabled = !ready || Math.abs(syncOffset) < 0.000001;

        if (!ready) {
            frameBackButton.disabled = true;
            frameForwardButton.disabled = true;
            return;
        }

        const frameDuration = 1 / fps;

        const referenceLastTime = Math.max(
            0,
            referenceDuration - 0.001
        );

        const distortedLastTime = Math.max(
            0,
            distortedDuration - 0.001
        );

        // -1 frame:
        // Si el offset es positivo, retrocede Distorted; si es cero o negativo, avanza Reference
        const canMoveBackward = syncOffset > 0
            ? getDistortedTime() - frameDuration >= 0
            : selectedReferenceTime + frameDuration <= referenceLastTime;

        // +1 frame:
        // Si el offset es negativo, retrocede Reference; si es cero o positivo, avanza Distorted
        const canMoveForward = syncOffset < 0
            ? selectedReferenceTime - frameDuration >= 0
            : getDistortedTime() + frameDuration <= distortedLastTime;

        frameBackButton.disabled = !canMoveBackward;
        frameForwardButton.disabled = !canMoveForward;
    }

    function notifyChange() {  // Actualiza los timestamps visibles y notifica a analyze-video.js para que actualice las miniaturas
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

    function updatePreview() {  // Notifica el timestamp correspondiente a cada video; si el timestamp distorsionado queda fuera de su duración, se informa en pantalla y se evita solicitar una miniatura para un instante inválido
        updateOffsetBounds();
        updateOffsetDisplay();
        notifyChange();
        updateControls();
    }

    // ---------------------------------------------------------
    // 6. Gestión de los archivos seleccionados.
    // ---------------------------------------------------------

    function updateSectionVisibility() {  // Muestra la sección de sincronización únicamente cuando se seleccionaron los dos archivos
        const bothFilesSelected = Boolean(
            referenceInput.files?.[0] &&
            distortedInput.files?.[0]
        );

        syncSection.hidden = !bothFilesSelected;
    }

    // Recalcula el rango simétrico del slider según el timestamp de anclaje
    function updateOffsetBounds() {
        if (!videosReady()) {
            updateControls();
            return;
        }

        const referenceLastTime = Math.max(
            0,
            referenceDuration - 0.001
        );

        const distortedLastTime = Math.max(
            0,
            distortedDuration - 0.001
        );

        // Determina el timestamp que permanece fijo al cruzar cero
        const anchorTime = syncOffset < 0
            ? getDistortedTime()
            : selectedReferenceTime;

        // Calcula el desplazamiento máximo disponible en cada dirección
        const referenceAvailable = Math.max(
            0,
            referenceLastTime - anchorTime
        );

        const distortedAvailable = Math.max(
            0,
            distortedLastTime - anchorTime
        );

        // Utiliza una escala simétrica y conserva el offset actual
        const maxOffset = Math.max(
            Math.abs(syncOffset),
            Math.min(referenceAvailable, distortedAvailable)
        );

        offsetSlider.min = String(-maxOffset);
        offsetSlider.max = String(maxOffset);
        offsetSlider.step = String(1 / fps);
        offsetSlider.value = String(syncOffset);
    }

    function setVideoMetadata({  // Recibe los metadatos de ambos videos devueltos por la API; no se necesita reproducir los archivos en el navegador
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

        updatePreview();
    }

    function clearMetadata() {  // Limpia el estado de sincronización cuando se seleccionan otros archivos o comienza un nuevo análisis
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
        updateSyncIndicators();

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
    function setOffset(newOffset) {
        if (!Number.isFinite(newOffset) || !videosReady()) {
            return;
        }

        newOffset = clampOffset(newOffset);

        const currentDistortedTime = getDistortedTime();

        const referenceLastTime = Math.max(
            0,
            referenceDuration - 0.001
        );

        const distortedLastTime = Math.max(
            0,
            distortedDuration - 0.001
        );

        if (newOffset < 0) {
            // Distorted permanece fijo y Reference se desplaza
            const anchorTime = syncOffset > 0
                ? selectedReferenceTime
                : currentDistortedTime;

            const maxNegativeOffset = Math.max(
                0,
                referenceLastTime - anchorTime
            );

            newOffset = Math.max(
                newOffset,
                -maxNegativeOffset
            );

            selectedReferenceTime = anchorTime - newOffset;

        } else {
            // Reference permanece fijo y Distorted se desplaza
            const anchorTime = syncOffset < 0
                ? currentDistortedTime
                : selectedReferenceTime;

            const maxPositiveOffset = Math.max(
                0,
                distortedLastTime - anchorTime
            );

            newOffset = Math.min(
                newOffset,
                maxPositiveOffset
            );

            if (syncOffset < 0) {
                selectedReferenceTime = anchorTime;
            }
        }

        syncOffset = newOffset;

        updatePreview();
    }

    function adjustByOneFrame(direction) {  // Desplaza el offset una cantidad equivalente a un frame; utiliza los FPS reales de la referencia cuando están disponibles
        if (!videosReady()) {
            return;
        }

        const frameDuration = 1 / fps;

        if (direction > 0) {
            if (syncOffset < 0) {
                // Vuelve hacia cero moviendo Reference hacia atrás
                selectedReferenceTime -= frameDuration;
                syncOffset += frameDuration;
            } else {
                // Desde cero, o con offset positivo, avanza Distorted
                syncOffset += frameDuration;
            }
        } else {
            if (syncOffset > 0) {
                // Vuelve hacia cero moviendo Distorted hacia atrás
                syncOffset -= frameDuration;
            } else {
                // Desde cero, o con offset negativo, avanza Reference
                selectedReferenceTime += frameDuration;
                syncOffset -= frameDuration;
            }
        }

        updatePreview();
    }

    function resetOffset() {  // Restablece el desplazamiento temporal a cero
        setOffset(0);
    }

    function setReferenceTime(seconds) {  // Actualiza el timestamp de referencia cuando el usuario selecciona un frame en un gráfico
        if (!Number.isFinite(seconds)) {
            return;
        }

        selectedReferenceTime = videosReady()
            ? Math.min(
                Math.max(0, seconds),
                Math.max(0, referenceDuration - 0.001)
            )
            : Math.max(0, seconds);

        updatePreview();
    }

    // ---------------------------------------------------------
    // 8. Conectar los eventos de la interfaz.
    // ---------------------------------------------------------

    referenceInput.addEventListener("change", () => {  // Cambios en los archivos seleccionados; al cambiar cualquiera de ellos, se invalidan los metadatos del análisis anterior
        clearMetadata();
        updateSectionVisibility();
    });

    distortedInput.addEventListener("change", () => {  // Cambios en los archivos seleccionados; al cambiar cualquiera de ellos, se invalidan los metadatos del análisis anterior
        clearMetadata();
        updateSectionVisibility();
    });

    offsetSlider.addEventListener("input", () => {  // El slider actualiza el offset mientras el usuario lo arrastra
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

    syncSection.hidden = true;  // La sección no aparece hasta que se seleccionan ambos archivos

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
