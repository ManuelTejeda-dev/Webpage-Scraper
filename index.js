const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

// Setup static files for serving images and scripts
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Webpage Scraper</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <div class="container">
        <h1>Webpage Scraper</h1>
        <form id="scrape-form">
          <label for="url">Enter a URL:</label>
          <input type="text" id="url" name="url" class="form-control" placeholder="https://www.example.com">
          <button class="btn btn-primary mt-3" type="button" onclick="scrapePage()">Scrape</button>
        </form>
        <div id="carousel-container" class="mt-5"></div>
        <div class="mt-5">
          <canvas id="wordChart"></canvas>
        </div>
      </div>
      
      <script>
        function scrapePage() {
          const url = document.getElementById('url').value;
          fetch(\`/scrape?url=\${encodeURIComponent(url)}\`)
            .then(response => response.json())
            .then(data => {
              displayImages(data.images);
              displayWordChart(data.wordCounts);
            })
            .catch(error => console.error('Error:', error));
        }

        function displayImages(images) {
          let carouselHtml = '<div id="imageCarousel" class="carousel slide" data-ride="carousel"><div class="carousel-inner">';
          images.forEach((img, index) => {
            carouselHtml += \`
              <div class="carousel-item \${index === 0 ? 'active' : ''}">
                <img src="\${img}" class="d-block w-100" alt="Image">
              </div>\`;
          });
          carouselHtml += '</div><a class="carousel-control-prev" href="#imageCarousel" role="button" data-slide="prev"><span class="carousel-control-prev-icon"></span></a><a class="carousel-control-next" href="#imageCarousel" role="button" data-slide="next"><span class="carousel-control-next-icon"></span></a></div>';
          document.getElementById('carousel-container').innerHTML = carouselHtml;
        }

        function displayWordChart(wordCounts) {
          const ctx = document.getElementById('wordChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: wordCounts.map(item => item.word),
              datasets: [{
                label: 'Word Count',
                data: wordCounts.map(item => item.count),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Get all image URLs
    const images = [];
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        images.push(src.startsWith('http') ? src : `${url}/${src}`);
      }
    });

    // Get all words and their counts
    const text = $('body').text().replace(/\s+/g, ' ').toLowerCase();
    const words = text.match(/\b\w+\b/g);
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    // Sort by highest count and get top 7 words
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([word, count]) => ({ word, count }));

    res.json({ images, wordCounts: topWords });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error scraping webpage');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
