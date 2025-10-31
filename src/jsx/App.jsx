import React, { useState, useEffect } from 'react';
import '../styles/styles.less';

// Load helpers.
// import formatNr from './helpers/FormatNr.js';
// import roundNr from './helpers/RoundNr.js';
import VoronoiTreemap from './components/VoronoiTreemap.jsx';

// const appID = '#app-root-2025-ldc_story';

function App() {
  // Data states.
  const [data, setData] = useState(false);

  useEffect(() => {
    const data_file = `${(window.location.href.includes('unctad.org')) ? 'https://storage.unctad.org/2025-ldc_story/' : (window.location.href.includes('localhost:80')) ? './' : 'https://unctad-infovis.github.io/2025-ldc_story/'}assets/data/data.json?v=1`;
    try {
      fetch(data_file)
        .then((response) => {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.text();
        })
        .then(body => setData(JSON.parse(body)));
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <div className="app">
      <div className="title_container">
        <div className="text_container">
          <div className="main_title_container">
            <img src="https://static.dwcdn.net/custom/themes/unctad-2024-rebrand/Blue%20arrow.svg" className="logo" alt="UN Trade and Development logo" />
            <div className="title">
              <h3>There is scope for diversification, especially in the Global South</h3>
            </div>
          </div>
          <h4>Percentage share of least developed countries (LDCs) exports to all trading partners</h4>
        </div>
      </div>
      <div className="legend_container">
        <div className="legend_item africa">Africa</div>
        <div className="legend_item america">America</div>
        <div className="legend_item asia_oceania">Asia and Oceania</div>
        <div className="legend_item europe">Europe</div>
      </div>
      {data && <VoronoiTreemap data={data} />}
      <div className="caption_container">
        <em>Source:</em>
        {' '}
        UN Trade and Development (UNCTAD), based on UNCTADStat.
        <br />
        <em>Note:</em>
        {' '}
        Three-year average over the period 2022–2024.
      </div>
    </div>
  );
}

export default App;
