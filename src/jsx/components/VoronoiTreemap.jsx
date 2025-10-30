import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { voronoiTreemap as createVoronoiTreemap } from 'd3-voronoi-treemap';
import * as d3 from 'd3';

import roundNr from '../helpers/RoundNr.js';

export default function VoronoiTreemap({ data }) {
  const svgRef = useRef();
  const svgContainerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  // Observe container size changes
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width } = entry.contentRect;
      setDimensions({ width, height: width }); // keep square
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw Voronoi treemap
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = {
      top: 10, right: 10, bottom: 10, left: 10
    };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const halfW = w / 2;
    const halfH = h / 2;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    const treemapRadius = Math.min(w, h) * 0.5;

    // Circular clip polygon
    const points = 60;
    const clipPolygon = Array.from({ length: points }, (_, i) => {
      const angle = (i / points) * Math.PI * 2;
      return [
        treemapRadius + treemapRadius * Math.cos(angle),
        treemapRadius + treemapRadius * Math.sin(angle)
      ];
    });

    // Create hierarchy
    const root = d3.hierarchy(data).sum(d => d.weight);

    // Assign initial positions based on continent
    const continentPositions = {
      Europe: [w * 0.25, h * 0.3],
      America: [w * 0.7, h * 0.3],
      Africa: [w * 0.25, h * 0.7],
      'Asia and Oceania': [w * 0.7, h * 0.7]
    };

    root.each(d => {
      if (!d.children) {
        const continent = d.parent.data.name;
        const [cx, cy] = continentPositions[continent] || [halfW, halfH];
        d.x = cx + (Math.random() - 0.5) * 5;
        d.y = cy + (Math.random() - 0.5) * 5;
      }
    });

    const layout = createVoronoiTreemap().clip(clipPolygon);
    try { layout(root); } catch (err) { console.error('Voronoi treemap error:', err); return; }

    const treemapG = g.append('g')
      .attr('transform', `translate(${halfW - treemapRadius}, ${halfH - treemapRadius})`);

    const leaves = root.leaves();

    // Draw cells
    treemapG.selectAll('path.cell')
      .data(leaves)
      .join('path')
      .attr('class', 'cell')
      .attr('d', d => `M${d.polygon.join(',')}Z`)
      .attr('fill', d => d.parent.data.color || '#ccc')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('opacity', 1)
      .style('cursor', 'pointer');

    // Top-level region borders thicker
    treemapG.selectAll('path.region-border')
      .data(root.children)
      .join('path')
      .attr('class', 'region-border')
      .attr('d', d => `M${d.polygon.join(',')}Z`)
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 4);

    // Labels
    const weights = leaves.map(d => d.data.weight);
    const textScale = d3.scaleLinear()
      .domain([Math.min(...weights), Math.max(...weights)])
      .range([Math.max(treemapRadius * 0.03, 7), Math.max(treemapRadius * 0.11, 15)])
      .clamp(true);

    const valueScale = d3.scaleLinear()
      .domain([Math.min(...weights), Math.max(...weights)])
      .range([Math.max(treemapRadius * 0.03, 12), Math.max(treemapRadius * 0.13, 16)])
      .clamp(true);

    // Labels with hover-to-show value
    const maxLineLength = 10; // max characters per line for name
    treemapG.selectAll('text.label')
      .data(leaves)
      .join('text')
      .attr('class', 'label')
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 300)
      .attr('fill', d => d.parent.data.text_color || '#000')
      .attr('stroke', '#000')
      .attr('stroke-width', d => ((d.parent.data.text_color === '#fff') ? 0.5 : 0)) // border thickness
      .attr('paint-order', 'stroke') // ensures stroke is drawn below fill
      .style('pointer-events', 'none') // text won't block pointer events
      .each((d, i, nodes) => {
        const text = d.data.weight < 1 ? d.data.code : d.data.name;
        const lines = [];
        let currentLine = '';
        text.split(' ').forEach(word => {
          if ((`${currentLine} ${word}`).trim().length <= maxLineLength) {
            currentLine = (currentLine ? `${currentLine} ` : '') + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);

        const [cx, cy] = d3.polygonCentroid(d.polygon);
        const fontSize = textScale(d.data.weight);
        const valueSize = valueScale(d.data.weight);

        const textElement = d3.select(nodes[i])
          .attr('x', cx)
          .attr('y', cy)
          .attr('font-size', fontSize);

        textElement.selectAll('tspan').remove();

        const totalLines = lines.length; // +1 for the hidden value line
        const lineHeight = fontSize * 1.2; // line spacing factor
        const offsetY = -((totalLines - 1) * lineHeight) / 2;

        // Name lines
        lines.forEach((line, idx) => {
          textElement.append('tspan')
            .attr('x', cx)
            .attr('dy', idx === 0 ? `${offsetY}px` : `${lineHeight}px`)
            .text(line);
        });

        // Value line (hidden)
        textElement.append('tspan')
          .attr('class', 'value-line')
          .attr('x', cx)
          .attr('dy', `${lineHeight}px`)
          .attr('fill', d_parent => d_parent.parent.data.text_color || '#000')
          .attr('font-size', valueSize)
          .attr('font-weight', 600)
          .attr('stroke', '#000')
          .attr('stroke-width', d_parent => ((d_parent.parent.data.text_color === '#fff') ? 1 : 0)) // border thickness
          .attr('paint-order', 'stroke') // ensures stroke is drawn below fill
          .style('pointer-events', 'none') // text won't block pointer events
          .style('opacity', (d.data.weight > 5) ? 1 : 0)
          .text(`${roundNr(d.data.weight, 1)}%`);
      });

    // Hover events on polygon (also triggers value visibility)
    leaves.forEach(d => {
      const polygon = treemapG.selectAll('path.cell').filter(p => p === d);
      const label = treemapG.selectAll('text.label').filter(t => t === d);

      const showValue = () => {
        polygon.transition().duration(200).style('opacity', 1);
        treemapG.selectAll('path.cell').filter(p => p !== d).transition().duration(200)
          .style('opacity', 0.7);
        label.select('.value-line').transition().duration(200).style('opacity', 1);
      };

      const hideValue = () => {
        treemapG.selectAll('path.cell').transition().duration(200).style('opacity', 1);
        label.select('.value-line').transition().duration(200).style('opacity', (d.data.weight > 5 ? 1 : 0));
      };

      polygon.on('mouseenter', showValue).on('mouseleave', hideValue);
      label.on('mouseenter', showValue).on('mouseleave', hideValue);
    });

    // Clip polygon outline (optional)
    treemapG.append('path')
      .attr('d', `M${clipPolygon.join(',')}Z`)
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-width', 0);
  }, [data, dimensions]);

  return (
    <div className="svg_container" ref={svgContainerRef} style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative' }}>
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
}

VoronoiTreemap.propTypes = {
  data: PropTypes.shape({
    name: PropTypes.string.isRequired,
    children: PropTypes.arrayOf(
      PropTypes.shape({
        children: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            weight: PropTypes.number.isRequired,
            code: PropTypes.string
          })
        ).isRequired,
        color: PropTypes.string,
        name: PropTypes.string.isRequired,
        text_color: PropTypes.string
      })
    ).isRequired
  }).isRequired
};
