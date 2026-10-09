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