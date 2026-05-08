document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calcForm');
    const fileInput = document.getElementById('imageUpload');
    const fileLabel = document.getElementById('file-name');
    const uploadLabel = document.querySelector('.file-upload-label');
    const resultBox = document.getElementById('resultBox');
    const actualSizeResult = document.getElementById('actualSizeResult');
    const errorBox = document.getElementById('errorBox');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const historyList = document.getElementById('historyList');

    // Fetch and display initial history
    fetchHistory();

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileLabel.textContent = e.target.files[0].name;
            uploadLabel.classList.add('has-file');
        } else {
            fileLabel.textContent = 'Drag & Drop or Click to Upload';
            uploadLabel.classList.remove('has-file');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Hide previous notices
        resultBox.classList.add('hidden');
        errorBox.classList.add('hidden');
        
        // Show loading
        submitBtn.classList.add('hidden');
        loading.classList.remove('hidden');

        const formData = new FormData(form);

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server error occurred');
            }

            // Success
            showResult(data);
            appendToHistory(data, true);
            form.reset();
            fileLabel.textContent = 'Drag & Drop or Click to Upload';
            uploadLabel.classList.remove('has-file');

        } catch (error) {
            showError(error.message);
        } finally {
            submitBtn.classList.remove('hidden');
            loading.classList.add('hidden');
        }
    });

    function showResult(data) {
        // Round to 4 decimal places maximum
        const formattedActualSize = Number(data.actual_size.toFixed(4));
        actualSizeResult.textContent = formattedActualSize;
        resultBox.classList.remove('hidden');
    }

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
    }

    async function fetchHistory() {
        try {
            const response = await fetch('/history');
            const data = await response.json();
            
            historyList.innerHTML = '';
            
            if (data.length === 0) {
                historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 1rem;">No conversions yet.</p>';
                return;
            }

            data.forEach(item => appendToHistory(item, false));
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    }

    function appendToHistory(item, prepend) {
        const emptyMsg = historyList.querySelector('p');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        const formattedActualSize = Number(item.actual_size.toFixed(4));
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-img-wrapper">
                <img src="/static/uploads/${item.filename}" alt="Microscope image" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'red\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Crect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'%3E%3C/rect%3E%3Ccircle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'%3E%3C/circle%3E%3Cpolyline points=\\'21 15 16 10 5 21\\'%3E%3C/polyline%3E%3C/svg%3E'">
            </div>
            <div class="history-details">
                <div class="history-size">Actual: ${formattedActualSize}</div>
                <div class="history-meta">In: ${item.input_size} | Mag: ${item.magnification}x</div>
            </div>
        `;

        if (prepend) {
            historyList.prepend(historyItem);
        } else {
            historyList.appendChild(historyItem);
        }
    }
});
