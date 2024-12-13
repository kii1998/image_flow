import requests
from flask import Flask, request, render_template_string, Response

app = Flask(__name__)

template = """
<!DOCTYPE html>
<html>
<head>
<title>Image URL Viewer</title>
</head>
<body>
    <form method="POST">
        <textarea name="urls" rows="5" cols="50">{{ urls_input }}</textarea>
        <br>
        <button type="submit">Show Images</button>
    </form>
    {% if images %}
        <div>
        {% for img_url in images %}
            <img src="{{ url_for('proxy_image', url=img_url) }}" alt="Image" style="max-width:200px;"/>
        {% endfor %}
        </div>
    {% endif %}
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def index():
    images = []
    urls_input = ""
    if request.method == 'POST':
        urls_input = request.form.get('urls', '')
        images = [url.strip() for url in urls_input.split() if url.strip()]

    return render_template_string(template, images=images, urls_input=urls_input)

@app.route('/image_proxy')
def proxy_image():
    image_url = request.args.get('url')
    if not image_url:
        return "No image URL provided", 400
    resp = requests.get(image_url, stream=True)
    if resp.status_code == 200:
        return Response(resp.content, mimetype=resp.headers.get('Content-Type', 'image/jpeg'))
    else:
        return "Failed to retrieve image", resp.status_code

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5666, debug=True)
