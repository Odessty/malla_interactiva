// Asegúrate de que este script esté en tu archivo script.js

document.addEventListener('DOMContentLoaded', () => {
    const asignaturas = document.querySelectorAll('.asignatura');
    const mallaContainer = document.querySelector('.malla-container');
    let activeLines = []; // Para almacenar las líneas SVG activas

    // --- Funciones de Utilidad ---

    // Función de debounce para optimizar el rendimiento de eventos como resize y scroll
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Función para obtener la posición y dimensiones de un elemento en relación con el documento
    const getElementCoords = (element) => {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY
        };
    };

    // Función para dibujar una línea SVG entre dos elementos
    const drawLine = (startElement, endElement, isPrereq = false) => {
        const startCoords = getElementCoords(startElement);
        const endCoords = getElementCoords(endElement);

        const startX = startCoords.left + startCoords.width;
        const startY = startCoords.top + startCoords.height / 2;
        const endX = endCoords.left;
        const endY = endCoords.top + endCoords.height / 2;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('prereq-svg-line');
        svg.style.position = 'absolute';
        svg.style.overflow = 'visible';
        svg.style.zIndex = '5';
        svg.style.pointerEvents = 'none';

        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        const margin = 10;
        svg.style.left = `${minX - margin}px`;
        svg.style.top = `${minY - margin}px`;
        svg.style.width = `${maxX - minX + (2 * margin)}px`;
        svg.style.height = `${maxY - minY + (2 * margin)}px`;
        svg.setAttribute('viewBox', `0 0 ${maxX - minX + (2 * margin)} ${maxY - minY + (2 * margin)}`);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', startX - minX + margin);
        line.setAttribute('y1', startY - minY + margin);
        line.setAttribute('x2', endX - minX + margin);
        line.setAttribute('y2', endY - minY + margin);
        line.setAttribute('stroke', isPrereq ? '#28a745' : '#007bff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');

        svg.appendChild(line);

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('fill', isPrereq ? '#28a745' : '#007bff');
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        mallaContainer.appendChild(svg);
        activeLines.push(svg);
    };

    // Función para limpiar todas las líneas
    const clearLines = () => {
        activeLines.forEach(line => line.remove());
        activeLines = [];
    };

    // --- Lógica de Materias Cursadas (Nueva) ---

    const CURSADAS_STORAGE_KEY = 'mallaPsicopedagogia_cursadas';

    // Función para cargar el estado de las materias cursadas desde localStorage
    const loadCursadasState = () => {
        try {
            const cursadasIds = JSON.parse(localStorage.getItem(CURSADAS_STORAGE_KEY) || '[]');
            cursadasIds.forEach(id => {
                const asignatura = document.querySelector(`.asignatura[data-id="${id}"]`);
                if (asignatura) {
                    asignatura.classList.add('cursada');
                }
            });
        } catch (e) {
            console.error("Error al cargar el estado de las materias cursadas:", e);
            // Si hay un error (ej. JSON corrupto), limpiar localStorage para evitar futuros errores
            localStorage.removeItem(CURSADAS_STORAGE_KEY);
        }
    };

    // Función para guardar el estado de las materias cursadas en localStorage
    const saveCursadasState = () => {
        const cursadasIds = [];
        document.querySelectorAll('.asignatura.cursada').forEach(asignatura => {
            cursadasIds.push(asignatura.dataset.id);
        });
        localStorage.setItem(CURSADAS_STORAGE_KEY, JSON.stringify(cursadasIds));
    };

    // --- Lógica Principal de Interacción ---

    asignaturas.forEach(asignatura => {
        asignatura.addEventListener('click', (event) => {
            const currentAsignatura = event.currentTarget;
            const asignaturaId = currentAsignatura.dataset.id;

            // 1. Alternar el estado "cursada" para la materia clicada
            currentAsignatura.classList.toggle('cursada');
            saveCursadasState(); // Guardar el nuevo estado

            // 2. Limpiar la selección previa y las líneas (para la visualización de prerrequisitos)
            asignaturas.forEach(item => {
                if (item !== currentAsignatura) { // No deseleccionar la que acabamos de cliquear
                    item.classList.remove('selected', 'prerequisito-active', 'cumple-prerequisito');
                    const prereqInfo = item.querySelector('.prereq-info');
                    if (prereqInfo) {
                        prereqInfo.style.display = 'none';
                    }
                }
            });
            clearLines();

            // 3. (Re)Aplicar la lógica de selección y prerrequisitos
            // Si la asignatura clicada NO está ya seleccionada para ver sus prerrequisitos, la seleccionamos.
            // Si SÍ está seleccionada, la deseleccionamos (un segundo click la desactiva)
            if (!currentAsignatura.classList.contains('selected')) {
                currentAsignatura.classList.add('selected');
                const currentPrereqInfo = currentAsignatura.querySelector('.prereq-info');
                if (currentPrereqInfo) {
                    currentPrereqInfo.style.display = 'block'; // Mostrar info de prerrequisitos
                }

                // Resaltar prerrequisitos (los que esta materia necesita)
                const prereqIds = currentAsignatura.dataset.prerequisito;
                if (prereqIds) {
                    const requiredPrereqs = prereqIds.split(',').map(id => id.trim());
                    requiredPrereqs.forEach(prereqId => {
                        const prereqElement = document.querySelector(`.asignatura[data-id="${prereqId}"]`);
                        if (prereqElement) {
                            prereqElement.classList.add('prerequisito-active');
                            drawLine(prereqElement, currentAsignatura, true);
                        }
                    });
                }

                // Resaltar las materias que esta asignatura es prerrequisito (es decir, las materias que dependen de la actual)
                asignaturas.forEach(otherAsignatura => {
                    const otherPrereqIds = otherAsignatura.dataset.prerequisito;
                    if (otherPrereqIds && otherPrereqIds.split(',').map(id => id.trim()).includes(currentAsignaturaId)) {
                        otherAsignatura.classList.add('cumple-prerequisito');
                        drawLine(currentAsignatura, otherAsignatura, false);
                    }
                });
            } else {
                 // Si ya estaba seleccionada, la deseleccionamos al segundo click
                currentAsignatura.classList.remove('selected');
                const prereqInfo = currentAsignatura.querySelector('.prereq-info');
                if (prereqInfo) {
                    prereqInfo.style.display = 'none';
                }
            }
        });
    });

    // Añadir un listener para clic fuera de las asignaturas para deseleccionar
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.asignatura')) {
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'cumple-prerequisito');
                const prereqInfo = item.querySelector('.prereq-info');
                if (prereqInfo) {
                    prereqInfo.style.display = 'none';
                }
            });
            clearLines();
        }
    });


    // --- Inicialización al cargar la página ---

    loadCursadasState(); // Cargar el estado al inicio

    const debouncedRedrawLines = debounce(() => {
        clearLines();
        const selectedAsignatura = document.querySelector('.asignatura.selected');
        if (selectedAsignatura) {
            selectedAsignatura.click(); // Simular un click para redibujar las líneas de la asignatura seleccionada
        }
    }, 200);

    window.addEventListener('resize', debouncedRedrawLines);
    document.querySelector('.malla-scroll-wrapper').addEventListener('scroll', debouncedRedrawLines);
});
