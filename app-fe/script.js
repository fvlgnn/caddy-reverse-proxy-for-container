const button = document.getElementById('fetch-data-btn');
const output = document.getElementById('json-output');

function addField(label, value) {
    const paragraph = document.createElement('p');
    const strong = document.createElement('strong');

    strong.textContent = `${label}: `;
    paragraph.append(strong, document.createTextNode(String(value)));
    output.append(paragraph);
}

button.addEventListener('click', async () => {
    button.disabled = true;
    output.textContent = 'Caricamento…';

    try {
        // A relative URL works with every hostname, port and protocol used to
        // serve the frontend, while keeping the request same-origin.
        const response = await fetch('/app-be/v1/get/once');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        output.replaceChildren();
        addField('ID', data.id);
        addField('Name', data.name);
        addField('Location', data.location);
    } catch (error) {
        output.textContent = `Errore nella richiesta: ${error.message}`;
    } finally {
        button.disabled = false;
    }
});
