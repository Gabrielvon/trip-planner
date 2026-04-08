// Integration test for Chinese sample presets
import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_PRESETS, parseTripTextMock } from '../.test-dist/mock.js';

test('Chinese sample presets load Chinese stops', () => {
  // Test all Chinese presets
  const chinesePresets = SAMPLE_PRESETS.filter(p => p.language === 'zh');
  
  console.log(`Found ${chinesePresets.length} Chinese presets`);
  assert.ok(chinesePresets.length >= 7, 'Should have at least 7 Chinese presets');
  
  for (const preset of chinesePresets) {
    console.log(`Testing preset: ${preset.label} (${preset.id})`);
    
    // Parse the preset
    const stops = parseTripTextMock(preset.text, preset.id);
    
    // Verify stops are not empty
    assert.ok(stops.length > 0, `Preset ${preset.id} should have stops`);
    
    // Verify first stop has Chinese characters for Chinese presets
    const firstStop = stops[0];
    const hasChinese = /[\u4e00-\u9fa5]/.test(firstStop.title);
    assert.ok(hasChinese, `First stop of ${preset.id} should have Chinese characters`);
    
    console.log(`  ✓ First stop: ${firstStop.title} - has Chinese: ${hasChinese}`);
  }
  
  console.log('All Chinese presets loaded successfully with Chinese stops!');
});

test('Shanghai Chinese preset loads specific Chinese stops', () => {
  const preset = SAMPLE_PRESETS.find(p => p.id === 'shanghai-chinese');
  assert.ok(preset, 'Shanghai Chinese preset should exist');
  
  const stops = parseTripTextMock(preset.text, preset.id);
  
  // Check for specific Shanghai stops
  const titles = stops.map(s => s.title);
  assert.ok(titles.includes('虹桥火车站'), 'Should include Hongqiao Railway Station');
  assert.ok(titles.includes('外滩'), 'Should include The Bund');
  assert.ok(titles.includes('豫园'), 'Should include Yu Garden');
  
  console.log('Shanghai Chinese preset loaded correct stops!');
});

test('Beijing Chinese preset loads correct stops', () => {
  const preset = SAMPLE_PRESETS.find(p => p.id === 'beijing-chinese');
  assert.ok(preset, 'Beijing Chinese preset should exist');
  
  const stops = parseTripTextMock(preset.text, preset.id);
  
  const titles = stops.map(s => s.title);
  assert.ok(titles.includes('北京南站'), 'Should include Beijing South Station');
  assert.ok(titles.includes('天安门广场'), 'Should include Tiananmen Square');
  assert.ok(titles.includes('故宫'), 'Should include Forbidden City');
  
  console.log('Beijing Chinese preset loaded correct stops!');
});

test('English presets still return English stops', () => {
  const preset = SAMPLE_PRESETS.find(p => p.id === 'shanghai-amap');
  assert.ok(preset, 'Shanghai English preset should exist');
  
  const stops = parseTripTextMock(preset.text, preset.id);
  
  const firstStop = stops[0];
  assert.ok(firstStop.title.includes('Hongqiao'), 'Should have English name');
  assert.ok(!/[\u4e00-\u9fa5]/.test(firstStop.title), 'Should not have Chinese characters');
  
  console.log('English presets still return English stops correctly!');
});
