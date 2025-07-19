document.addEventListener('DOMContentLoaded', () => {
    const asignaturas = document.querySelectorAll('.asignatura');
    const mallaContainer = document.querySelector('.malla-container');
    // activeLines ya no es estrictamente necesario para dibujar, pero se mantiene clearLines
    let activeLines = []; 

    // --- Funciones de Utilidad ---

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // drawLine ya no es necesaria, la mantenemos comentada o la podrías borrar
    /*
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

    const drawLine = (startElement, endElement, isPrereq = false) => {
        // Esta función ya no se llama, pero si la necesitaras para depurar, aquí está el contenido original.
        // ... (código original de drawLine) ...
    };
    */

    // clearLines ahora solo asegura que no haya SVGs residuales si alguna vez se dibujaron
    const clearLines = () => {
        activeLines.forEach(line => line.remove());
        activeLines = [];
    };

    // --- Lógica de Materias Cursadas ---

    const CURSADAS_STORAGE_KEY = 'mallaPsicopedagogia_cursadas';

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
            localStorage.removeItem(CURSADAS_STORAGE_KEY);
        }
    };

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

            // Alternar el estado "cursada"
            currentAsignatura.classList.toggle('cursada');
            saveCursadasState();

            // Deseleccionar todas las asignaturas y limpiar resaltados previos
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'dependencia-active'); // Eliminamos 'cumple-prerequisito' y añadimos 'dependencia-active'
                const prereqInfo = item.querySelector('.prereq-info');
                if (prereqInfo) {
                    prereqInfo.style.display = 'none';
                }
            });
            clearLines(); // Asegurarse de limpiar cualquier SVG residual

            // Si la asignatura clicada NO tiene la clase 'selected' (después de haberlas limpiado)
            // entonces la seleccionamos para mostrar sus relaciones.
            if (!currentAsignatura.classList.contains('selected')) {
                currentAsignatura.classList.add('selected');
                const currentPrereqInfo = currentAsignatura.querySelector('.prereq-info');
                if (currentPrereqInfo) {
                    currentPrereqInfo.style.display = 'block'; // Mostrar info de prerrequisitos
                }

                // Resaltar prerrequisitos de la asignatura seleccionada
                const prereqIds = currentAsignatura.dataset.prerequisito;
                if (prereqIds) {
                    const requiredPrereqs = prereqIds.split(',').map(id => id.trim());
                    requiredPrereqs.forEach(prereqId => {
                        const prereqElement = document.querySelector(`.asignatura[data-id="${prereqId}"]`);
                        if (prereqElement) {
                            prereqElement.classList.add('prerequisito-active'); // Clase para prerrequisitos requeridos
                        }
                    });
                }

                // Resaltar las materias que tienen la asignatura seleccionada como prerrequisito
                asignaturas.forEach(otherAsignatura => {
                    const otherPrereqIds = otherAsignatura.dataset.prerequisito;
                    if (otherPrereqIds && otherPrereqIds.split(',').map(id => id.trim()).includes(asignaturaId)) {
                        otherAsignatura.classList.add('dependencia-active'); // Clase para dependencias futuras
                    }
                });
            }
        });
    });

    // Añadir un listener para clic fuera de las asignaturas para deseleccionar
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.asignatura')) {
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'dependencia-active');
                const prereqInfo = item.querySelector('.prereq-info');
                if (prereqInfo) {
                    prereqInfo.style.display = 'none';
                }
            });
            clearLines();
        }
    });

    // --- Inicialización al cargar la página ---

    loadCursadasState();

    // El debouncedRedrawLines ya no es esencial para líneas, pero se mantiene para la lógica de resaltado
    const debouncedRedrawLines = debounce(() => {
        clearLines(); // Limpiar cualquier SVG residual
        const selectedAsignatura = document.querySelector('.asignatura.selected');
        if (selectedAsignatura) {
            // Repetir la lógica de resaltado de clases si hay una asignatura seleccionada
            selectedAsignatura.classList.add('selected');
            const currentPrereqInfo = selectedAsignatura.querySelector('.prereq-info');
            if (currentPrereqInfo) {
                currentPrereqInfo.style.display = 'block';
            }

            const prereqIds = selectedAsignatura.dataset.prerequisito;
            if (prereqIds) {
                const requiredPrereqs = prereqIds.split(',').map(id => id.trim());
                requiredPrereqs.forEach(prereqId => {
                    const prereqElement = document.querySelector(`.asignatura[data-id="${prereqId}"]`);
                    if (prereqElement) {
                        prereqElement.classList.add('prerequisito-active');
                    }
                });
            }
            const currentAsignaturaId = selectedAsignatura.dataset.id;
            asignaturas.forEach(otherAsignatura => {
                const otherPrereqIds = otherAsignatura.dataset.prerequisito;
                if (otherPrereqIds && otherPrereqIds.split(',').map(id => id.trim()).includes(currentAsignaturaId)) {
                    otherAsignatura.classList.add('dependencia-active');
                }
            });
        }
    }, 200);

    window.addEventListener('resize', debouncedRedrawLines);
    document.querySelector('.malla-scroll-wrapper').addEventListener('scroll', debouncedRedrawLines);
});
