import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const metricsData = await request.json()
    
    // Validate metrics data
    if (!metricsData.metrics || !Array.isArray(metricsData.metrics)) {
      return NextResponse.json(
        { error: 'Missing or invalid metrics data' },
        { status: 400 }
      )
    }

    // Store metrics in database
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        )

        // Prepare metrics for insertion
        const metricsToInsert = metricsData.metrics.map((metric: any) => ({
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit || null,
          service_name: metric.service || 'frontend',
          environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
          metadata: metric.metadata || {}
        }))

        const { error } = await supabase
          .from('system_metrics')
          .insert(metricsToInsert)

        if (error) {
          console.error('Failed to store metrics:', error)
          return NextResponse.json(
            { error: 'Failed to store metrics' },
            { status: 500 }
          )
        }

      } catch (dbError) {
        console.error('Database error while storing metrics:', dbError)
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { 
        success: true,
        metricsStored: metricsData.metrics.length,
        message: 'Metrics stored successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Metrics endpoint failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to store metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const timeframe = searchParams.get('timeframe') || '1h'
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Calculate time filter
    const timeFilter = getTimeFilter(timeframe)
    
    let query = supabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', timeFilter)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (service) {
      query = query.eq('service_name', service)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      )
    }

    // Aggregate metrics by service and metric name
    const aggregated = aggregateMetrics(data || [])

    return NextResponse.json(
      {
        success: true,
        timeframe,
        service,
        totalRecords: data?.length || 0,
        metrics: aggregated
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Metrics GET endpoint failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getTimeFilter(timeframe: string): string {
  const now = new Date()
  
  switch (timeframe) {
    case '15m':
      return new Date(now.getTime() - 15 * 60 * 1000).toISOString()
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  }
}

function aggregateMetrics(metrics: any[]): Record<string, any> {
  const aggregated: Record<string, any> = {}

  for (const metric of metrics) {
    const key = `${metric.service_name}.${metric.metric_name}`
    
    if (!aggregated[key]) {
      aggregated[key] = {
        service: metric.service_name,
        metric: metric.metric_name,
        unit: metric.metric_unit,
        count: 0,
        sum: 0,
        avg: 0,
        min: metric.metric_value,
        max: metric.metric_value,
        latest: metric.metric_value,
        latestTimestamp: metric.recorded_at
      }
    }

    const agg = aggregated[key]
    agg.count++
    agg.sum += metric.metric_value
    agg.avg = agg.sum / agg.count
    agg.min = Math.min(agg.min, metric.metric_value)
    agg.max = Math.max(agg.max, metric.metric_value)
    
    // Update latest if this record is newer
    if (new Date(metric.recorded_at) > new Date(agg.latestTimestamp)) {
      agg.latest = metric.metric_value
      agg.latestTimestamp = metric.recorded_at
    }
  }

  return aggregated
}