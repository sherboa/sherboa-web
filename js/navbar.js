// Este módulo maneja la funcionalidad del menú de navegación, incluyendo la apertura y cierre del menú en dispositivos móviles y la actualización de los atributos ARIA para accesibilidad.

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector("#nav-menu");

menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";

    menuToggle.setAttribute("aria-expanded", !isExpanded);
    menuToggle.setAttribute(
        "aria-label",
        isExpanded ? "Open navigation menu" : "Close navigation menu"
    );

    navMenu.style.display = isExpanded ? "none" : "flex";
});