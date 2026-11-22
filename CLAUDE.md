# Follow-Along (decisiones)
- App estática: HTML/CSS/JS sin framework ni dependencias externas. Sin rastreadores. Rutas relativas (funciona en /ds-follow-along/).
- Publica GitHub Actions al hacer push a `main` (tools/stamp.py estampa BUILD y lista de archivos en sw.js).
- Actualización: el SW nuevo espera; la app muestra aviso y recarga con SKIP_WAITING. Sin reinstalar.
- Datos del usuario en localStorage `dsfa:data`, con `v` y migraciones en js/storage.js. Nunca borrar datos al migrar.
- Textos UI: i18n/{es,en}.json. Lecciones: content/{es,en}/tema-NN.json (+ index.json).
- Accesible: teclado, foco en título al cambiar de bloque, contraste, lenguaje claro.
- Orden: (1) despliegue+update+progreso, (2) Tema 1 + presupuesto de Carlos, (3) traducciones, (4) temas 2-10.
- Prototipo origen: rama ld/lessons-app-leccion-1 (copia en /mnt/project-files/lessons-app/).
- Temas 2-10 y la lección emergency-fund (Tema 1) se importan del sitio público con `python3 tools/import-lessons.py`. No editar a mano esos JSON: se sobrescriben. Tema 1 (plan de Carlos) es manual.
