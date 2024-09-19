// Seleziona il pulsante e l'elemento in cui mostrare i dati
const button = document.getElementById('fetch-data-btn');
const outputDiv = document.getElementById('json-output');

// Aggiungi un event listener al pulsante per avviare la chiamata AJAX
button.addEventListener('click', () => {
    // Creare un nuovo oggetto XMLHttpRequest
    const xhr = new XMLHttpRequest();

    // Specificare il tipo di richiesta e l'URL del server
    xhr.open('GET', 'http://localhost:8000/app-be/v1/get/once', true);

    // Definire cosa fare quando la risposta è pronta
    xhr.onload = function() {
        if (xhr.status === 200) {
            // Analizza la risposta JSON
            const jsonResponse = JSON.parse(xhr.responseText);
            
            // Mostra il contenuto JSON sulla pagina
            outputDiv.innerHTML = `
                <p><strong>ID:</strong> ${jsonResponse.id}</p>
                <p><strong>Name:</strong> ${jsonResponse.name}</p>
                <p><strong>Location:</strong> ${jsonResponse.location}</p>
            `;
        } else {
            outputDiv.textContent = 'Errore nella richiesta: ' + xhr.status;
        }
    };

    // Invia la richiesta
    xhr.send();
});
