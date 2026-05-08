import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
DB_PATH = 'history.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            input_size REAL,
            magnification REAL,
            actual_size REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided.'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected image.'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp.'}), 400
    
    try:
        input_size = float(request.form.get('input_size'))
        magnification = float(request.form.get('magnification'))
        if magnification == 0:
            return jsonify({'error': 'Magnification cannot be zero.'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid numerical inputs.'}), 400
        
    actual_size = input_size / magnification
    
    from werkzeug.utils import secure_filename
    filename = secure_filename(file.filename)
    timestamp_str = datetime.now().strftime('%Y%m%d%H%M%S')
    final_filename = f"{timestamp_str}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], final_filename)
    
    file.save(filepath)
    
    # Save to Database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO calculations (filename, input_size, magnification, actual_size) VALUES (?, ?, ?, ?)',
        (final_filename, input_size, magnification, actual_size)
    )
    inserted_id = c.lastrowid
    
    c.execute('SELECT * FROM calculations WHERE id = ?', (inserted_id,))
    row = c.fetchone()
    conn.commit()
    conn.close()
    
    result = {
        'id': row[0],
        'filename': row[1],
        'input_size': row[2],
        'magnification': row[3],
        'actual_size': row[4],
        'timestamp': row[5]
    }
    
    return jsonify(result)

@app.route('/history', methods=['GET'])
def get_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM calculations ORDER BY timestamp DESC')
    rows = c.fetchall()
    conn.close()
    
    history_data = [dict(ix) for ix in rows]
    return jsonify(history_data)
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)
