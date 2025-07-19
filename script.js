document.addEventListener('DOMContentLoaded', () => {
    const asignaturas = document.querySelectorAll('.asignatura');
    const mallaContainer = document.querySelector('.malla-container');
    let activeLines = []; // Se mantiene para clearLines, aunque no se dibujen SVGs

    // --- Funciones de Utilidad ---

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

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

    // --- NUEVA FUNCIÓN: Actualizar materias disponibles ---
    const updateAvailableSubjects = () => {
        // Primero, limpiar el estado 'disponible' de todas las asignaturas
        asignaturas.forEach(asignatura => {
            asignatura.classList.remove('disponible');
        });

        asignaturas.forEach(asignatura => {
            // Si la asignatura ya está cursada, no la marcamos como disponible
            if (asignatura.classList.contains('cursada')) {
                return;
            }

            const prereqIds = asignatura.dataset.prerequisito;

            // Si no tiene prerrequisitos, y no está cursada, está disponible
            if (!prereqIds) {
                asignatura.classList.add('disponible');
                return;
            }

            // Si tiene prerrequisitos, verificar si todos están cursados
            const requiredPrereqs = prereqIds.split(',').map(id => id.trim());
            let allPrereqsMet = true;

            for (const prereqId of requiredPrereqs) {
                const prereqElement = document.querySelector(`.asignatura[data-id="${prereqId}"]`);
                if (!prereqElement || !prereqElement.classList.contains('cursada')) {
                    allPrereqsMet = false; // Al menos un prerrequisito no está cursado
                    break;
                }
            }

            if (allPrereqsMet) {
                asignatura.classList.add('disponible');
            }
        });
    };

    // --- Lógica Principal de Interacción ---

    asignaturas.forEach(asignatura => {
        asignatura.addEventListener('click', (event) => {
            const currentAsignatura = event.currentTarget;
            const asignaturaId = currentAsignatura.dataset.id;

            // Alternar el estado "cursada"
            currentAsignatura.classList.toggle('cursada');
            saveCursadasState(); // Guardar el nuevo estado

            // !!! IMPORTANTE: Llamar a updateAvailableSubjects después de cambiar el estado de 'cursada'
            updateAvailableSubjects();

            // Deseleccionar todas las asignaturas y limpiar resaltados previos
            asignaturas.forEach(item => {
                item.classList.remove('selected', 'prerequisito-active', 'dependencia-active');
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

    loadCursadasState(); // Cargar el estado al inicio
    updateAvailableSubjects(); // !!! IMPORTANTE: Llamar al inicio para establecer el estado inicial de disponibilidad

    // El debouncedRedrawLines ya no es esencial para líneas, pero se mantiene para la lógica de resaltado
    const debouncedRedrawLines = debounce(() => {
        clearLines(); // Limpiar cualquier SVG residual
        updateAvailableSubjects(); // !!! IMPORTANTE: Re-evaluar disponibilidad en resize/scroll

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
