import { test, expect, Page, BrowserContext } from '@playwright/test';

// Production app URL
const PRODUCTION_URL = 'https://emma-ai-coaching.vercel.app';

test.describe('Emma AI Production App E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create new context with mobile and desktop viewports
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['microphone'], // Grant microphone permission for voice tests
    });
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => console.log(`Console: ${msg.text()}`));
    page.on('pageerror', err => console.error(`Page Error: ${err.message}`));
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('1. Navigation and Demo Page Voice Interface', async () => {
    console.log('🎯 Testing Demo Page Voice Interface');
    
    // Navigate to production app
    const startTime = Date.now();
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
    
    // Check if page loads successfully
    expect(page.url()).toBe(PRODUCTION_URL + '/');
    console.log(`✅ Homepage loaded in ${loadTime.toFixed(2)}ms`);
    
    // Navigate to demo page
    console.log('🔄 Navigating to /demo page...');
    await page.goto(`${PRODUCTION_URL}/demo`, { waitUntil: 'networkidle' });
    
    // Take screenshot of demo page
    await page.screenshot({ path: 'screenshots/demo-page.png', fullPage: true });
    
    // Check for voice interface components
    const voiceButton = page.locator('button:has-text("Start"), button:has-text("Record"), [aria-label*="voice"], [data-testid*="voice"]').first();
    
    if (await voiceButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Voice interface button found');
      await voiceButton.screenshot({ path: 'screenshots/voice-button.png' });
      
      // Test voice button interaction
      await voiceButton.click();
      await page.waitForTimeout(2000);
      
      // Check for visual feedback (recording state)
      const recordingIndicator = page.locator('[class*="recording"], [class*="pulse"], .animate-pulse').first();
      if (await recordingIndicator.isVisible({ timeout: 3000 })) {
        console.log('✅ Recording state visual feedback detected');
        await page.screenshot({ path: 'screenshots/voice-recording-active.png' });
      }
      
      // Stop recording after brief test
      await voiceButton.click();
      console.log('✅ Voice interface interaction completed');
    } else {
      console.log('⚠️ Voice interface not immediately visible - checking for alternative selectors');
      await page.screenshot({ path: 'screenshots/demo-page-no-voice-button.png', fullPage: true });
    }
  });

  test('2. Monitoring Page Quality Gate System', async () => {
    console.log('🎯 Testing Monitoring Page Quality Gates');
    
    // Navigate to monitoring page
    await page.goto(`${PRODUCTION_URL}/monitoring`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/monitoring-page.png', fullPage: true });
    
    // Check for monitoring dashboard elements
    const qualityGates = [
      'Response Quality',
      'Safety Check',
      'Ethical Guidelines',
      'Privacy Protection',
      'Performance',
      'quality-gate',
      'monitoring',
      'dashboard'
    ];
    
    let foundElements = 0;
    for (const gate of qualityGates) {
      const element = page.locator(`text="${gate}", [data-testid*="${gate.toLowerCase()}"], [class*="${gate.toLowerCase().replace(' ', '-')}"]`).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✅ Found quality gate: ${gate}`);
        foundElements++;
        await element.screenshot({ path: `screenshots/quality-gate-${gate.toLowerCase().replace(' ', '-')}.png` });
      }
    }
    
    if (foundElements === 0) {
      console.log('⚠️ No quality gate elements found - checking page content');
      const pageText = await page.textContent('body');
      console.log('Page content preview:', pageText?.substring(0, 500));
    }
    
    // Check for real-time monitoring features
    const metricsElements = page.locator('[class*="metric"], [class*="chart"], [class*="graph"], [data-testid*="metric"]');
    const metricsCount = await metricsElements.count();
    console.log(`📊 Found ${metricsCount} metrics elements`);
    
    if (metricsCount > 0) {
      await metricsElements.first().screenshot({ path: 'screenshots/metrics-element.png' });
    }
  });

  test('3. Crisis Detection Workflow via Chat Interface', async () => {
    console.log('🎯 Testing Crisis Detection Workflow');
    
    // Navigate to main chat interface
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Look for chat input or text area
    const chatSelectors = [
      'input[type="text"]',
      'textarea',
      '[placeholder*="message"]',
      '[placeholder*="chat"]',
      '[placeholder*="talk"]',
      '[data-testid*="chat"]',
      '[aria-label*="message"]'
    ];
    
    let chatInput = null;
    for (const selector of chatSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        chatInput = element;
        console.log(`✅ Found chat input: ${selector}`);
        break;
      }
    }
    
    if (chatInput) {
      await chatInput.screenshot({ path: 'screenshots/chat-input.png' });
      
      // Test crisis detection with sample concerning message
      const crisisTestMessage = "I'm feeling really overwhelmed and having thoughts that worry me";
      await chatInput.fill(crisisTestMessage);
      
      // Look for send button
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [data-testid*="send"]').first();
      if (await sendButton.isVisible({ timeout: 2000 })) {
        await sendButton.click();
        console.log('✅ Crisis test message sent');
        
        // Wait for response and check for crisis detection
        await page.waitForTimeout(5000);
        
        // Look for crisis detection response indicators
        const crisisIndicators = [
          'crisis',
          'support',
          'helpline',
          'emergency',
          'professional help',
          'mental health'
        ];
        
        const pageContent = await page.textContent('body');
        const detectedCrisis = crisisIndicators.some(indicator => 
          pageContent?.toLowerCase().includes(indicator.toLowerCase())
        );
        
        if (detectedCrisis) {
          console.log('✅ Crisis detection workflow triggered');
          await page.screenshot({ path: 'screenshots/crisis-detection-response.png', fullPage: true });
        } else {
          console.log('⚠️ Crisis detection not clearly triggered');
          await page.screenshot({ path: 'screenshots/chat-response.png', fullPage: true });
        }
      } else {
        console.log('⚠️ Send button not found');
        await page.screenshot({ path: 'screenshots/chat-no-send-button.png', fullPage: true });
      }
    } else {
      console.log('⚠️ Chat input not found');
      await page.screenshot({ path: 'screenshots/no-chat-input.png', fullPage: true });
    }
  });

  test('4. Responsive Design and Accessibility Compliance', async () => {
    console.log('🎯 Testing Responsive Design and Accessibility');
    
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
      
      await page.screenshot({ 
        path: `screenshots/responsive-${viewport.name}.png`, 
        fullPage: true 
      });
      
      // Check for responsive layout issues
      const horizontalScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      
      if (horizontalScrollWidth > viewportWidth + 20) {
        console.log(`⚠️ Horizontal scroll detected on ${viewport.name}: ${horizontalScrollWidth}px > ${viewportWidth}px`);
      } else {
        console.log(`✅ No horizontal scroll on ${viewport.name}`);
      }
    }
    
    // Reset to desktop for accessibility tests
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Basic accessibility checks
    console.log('♿ Running accessibility checks...');
    
    // Check for basic accessibility elements
    const accessibilityChecks = [
      { selector: 'h1, h2, h3, h4, h5, h6', description: 'Heading structure' },
      { selector: '[alt]', description: 'Image alt attributes' },
      { selector: 'button, input[type="button"], input[type="submit"]', description: 'Interactive buttons' },
      { selector: '[aria-label], [aria-labelledby]', description: 'ARIA labels' },
      { selector: 'main, [role="main"]', description: 'Main content landmark' }
    ];
    
    for (const check of accessibilityChecks) {
      const elements = await page.locator(check.selector).count();
      if (elements > 0) {
        console.log(`✅ ${check.description}: ${elements} elements found`);
      } else {
        console.log(`⚠️ ${check.description}: No elements found`);
      }
    }
    
    // Tab navigation test
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`🔍 Tab navigation: First focused element is ${focusedElement}`);
  });

  test('5. Performance Metrics and Core Web Vitals', async () => {
    console.log('🎯 Testing Performance Metrics and Core Web Vitals');
    
    // Enable performance monitoring
    await page.goto('about:blank');
    
    // Navigate with performance timing
    const navigationStart = Date.now();
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    const navigationEnd = Date.now();
    const totalLoadTime = navigationEnd - navigationStart;
    
    console.log(`⏱️ Total page load time: ${totalLoadTime.toFixed(2)}ms`);
    
    // Get Core Web Vitals using built-in metrics
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {};
        
        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            metrics.lcp = entries[entries.length - 1].startTime;
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // FID would require real user interaction, so we'll skip it
        
        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        
        // Wait a bit for metrics to be collected
        setTimeout(() => {
          resolve(metrics);
        }, 3000);
      });
    });
    
    console.log('📊 Core Web Vitals Results:');
    console.log(`   LCP: ${(webVitals as any).lcp?.toFixed(2) || 'N/A'}ms (target: <2500ms)`);
    console.log(`   CLS: ${(webVitals as any).cls?.toFixed(3) || 'N/A'} (target: <0.1)`);
    
    // Performance timing API data
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    console.log('🚀 Performance Timing Metrics:');
    console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`   First Paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`);
    console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`);
    
    // Resource loading analysis
    const resources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const analysis = {
        totalResources: resources.length,
        slowResources: resources.filter(r => r.duration > 1000).length,
        largeResources: resources.filter(r => (r as any).transferSize > 100000).length
      };
      return analysis;
    });
    
    console.log('📦 Resource Analysis:');
    console.log(`   Total Resources: ${resources.totalResources}`);
    console.log(`   Slow Resources (>1s): ${resources.slowResources}`);
    console.log(`   Large Resources (>100KB): ${resources.largeResources}`);
    
    // Take final performance screenshot
    await page.screenshot({ path: 'screenshots/performance-test-complete.png', fullPage: true });
    
    // Performance assertions
    expect(totalLoadTime).toBeLessThan(10000); // Should load within 10 seconds
    expect((webVitals as any).cls || 0).toBeLessThan(0.25); // Reasonable CLS threshold
  });
});