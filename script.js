document.addEventListener('DOMContentLoaded', () => {
    const asignaturas = document.querySelectorAll('.asignatura');
    const mallaContainer = document.querySelector('.malla-container');
    let activeLines = []; // Para almacenar las líneas de prerrequisito activas

    // Función para obtener la posición y dimensiones de un elemento
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
    // Optamos por SVG por ser más robusto para líneas complejas y escalable
    const drawLine = (startElement, endElement, isPrereq = false) => {
        const startCoords = getElementCoords(startElement);
        const endCoords = getElementCoords(endElement);

        // Calcular puntos de inicio y fin de la línea
        // Conexión desde el centro derecho del prerrequisito hasta el centro izquierdo del requisito
        const startX = startCoords.left + startCoords.width; // Lado derecho del prerrequisito
        const startY = startCoords.top + startCoords.height / 2;
        const endX = endCoords.left; // Lado izquierdo del requisito
        const endY = endCoords.top + endCoords.height / 2;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('prereq-svg-line');
        // Asegurarse de que el SVG abarque un área lo suficientemente grande
        svg.style.position = 'absolute';
        svg.style.overflow = 'visible'; // Permite que la línea se dibuje fuera del viewBox si es necesario
        svg.style.zIndex = '5'; // Por debajo de las asignaturas
        svg.style.pointerEvents = 'none'; // Para que no interfiera con los clics en las asignaturas

        // Establecer la posición del SVG para cubrir el área entre los dos elementos
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        svg.style.left = `${minX - 5}px`; // Un pequeño margen
        svg.style.top = `${minY - 5}px`;
        svg.style.width = `${maxX - minX + 10}px`;
        svg.style.height = `${maxY - minY + 10}px`;
        svg.setAttribute('viewBox', `0 0 ${maxX - minX + 10} ${maxY - minY + 10}`);


        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', startX - minX + 5);
        line.setAttribute('y1', startY - minY + 5);
        line.setAttribute('x2', endX - minX + 5);
        line.setAttribute('y2', endY - minY + 5);
        line.setAttribute('stroke', isPrereq ? '#28a745' : '#007bff'); // Color de la línea
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)'); // Añadir punta de flecha

        svg.appendChild(line);

        // Definir la punta de flecha
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '0'); // Posición de la punta de flecha en relación con el final de la línea
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('fill', isPrereq ? '#28a745' : '#007bff');
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        mallaContainer.appendChild(svg);
        activeLines.push(svg); // Guardar referencia para poder removerla
    };

    // Función para limpiar todas las líneas
    const clearLines = () => {
        activeLines.forEach(line => line.remove());
        activeLines = [];
    };

    // Función principal para manejar el clic en una asignatura
    asignaturas.forEach(asignatura => {
        asignatura.addEventListener('click', (event) => {
            // Limpiar selección previa y líneas
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'cumple-prerequisito');
                item.querySelector('.prereq-info').style.display = 'none'; // Ocultar info de prerrequisitos
            });
            clearLines();

            // Seleccionar la asignatura actual
            const currentAsignatura = event.currentTarget;
            currentAsignatura.classList.add('selected');
            currentAsignatura.querySelector('.prereq-info').style.display = 'block'; // Mostrar info de prerrequisitos

            // Resaltar prerrequisitos (los que esta materia necesita)
            const prereqIds = currentAsignatura.dataset.prerequisito;
            if (prereqIds) {
                const requiredPrereqs = prereqIds.split(',').map(id => id.trim());
                requiredPrereqs.forEach(prereqId => {
                    const prereqElement = document.querySelector(`.asignatura[data-id="${prereqId}"]`);
                    if (prereqElement) {
                        prereqElement.classList.add('prerequisito-active');
                        // Dibujar línea del prerrequisito a la materia actual
                        drawLine(prereqElement, currentAsignatura, true); // true indica que es un prerrequisito
                    }
                });
            }

            // Resaltar las materias que esta asignatura es prerrequisito
            const currentAsignaturaId = currentAsignatura.dataset.id;
            asignaturas.forEach(otherAsignatura => {
                const otherPrereqIds = otherAsignatura.dataset.prerequisito;
                if (otherPrereqIds && otherPrereqIds.split(',').map(id => id.trim()).includes(currentAsignaturaId)) {
                    otherAsignatura.classList.add('cumple-prerequisito'); // o una clase similar
                    // Dibujar línea de la materia actual a la que la necesita
                    drawLine(currentAsignatura, otherAsignatura, false); // false indica que no es un prerrequisito para esta
                }
            });
        });
    });

    // Añadir un listener para clic fuera de las asignaturas para deseleccionar
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.asignatura')) {
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'cumple-prerequisito');
                item.querySelector('.prereq-info').style.display = 'none';
            });
            clearLines();
        }
    });

    // Reajustar líneas al redimensionar la ventana
    window.addEventListener('resize', () => {
        // Podrías añadir un debounce aquí para evitar que se ejecute en cada pixel de redimensionamiento
        clearLines();
        // Redibujar las líneas para la asignatura actualmente seleccionada, si la hay
        const selectedAsignatura = document.querySelector('.asignatura.selected');
        if (selectedAsignatura) {
            // Simular un click para redibujar
            selectedAsignatura.click();
        }
    });
});
