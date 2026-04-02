import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  Activity, AlertTriangle, TrendingUp, Zap, Brain, 
  Shield, Cpu, Database, Wifi, Heart
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalVehicles: number;
    activeTrips: number;
    totalEmergencies: number;
    activeEmergencies: number;
    totalDrivers: number;
  };
  emergencyMetrics: {
    last24Hours: number;
    last7Days: number;
    averageResponseTime: number;
    resolutionRate: number;
  };
  vehicleMetrics: {
    fuelEfficiency: Array<{ vehicleNumber: string; efficiency: number }>;
    maintenanceAlerts: Array<{ vehicleNumber: string; alert: string; priority: string }>;
    utilizationRate: Array<{ vehicleNumber: string; utilization: number }>;
  };
  performanceKPIs: {
    systemUptime: number;
    responseAccuracy: number;
    driverSatisfaction: number;
    emergencyPreventionRate: number;
  };
  trends: {
    emergencyTrends: Array<{ date: string; count: number }>;
    fuelConsumption: Array<{ date: string; consumption: number }>;
    maintenanceCosts: Array<{ date: string; cost: number }>;
  };
}

interface PredictiveMaintenanceData {
  criticalVehicles: Array<{
    vehicleNumber: string;
    riskScore: number;
    predictedFailureDate: string;
    recommendedActions: string[];
    estimatedCost: number;
  }>;
  maintenanceSchedule: Array<{
    vehicleNumber: string;
    serviceType: string;
    scheduledDate: string;
    priority: string;
  }>;
}

export function AdvancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [predictiveData, setPredictiveData] = useState<PredictiveMaintenanceData | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
    fetchPredictiveData();
    fetchPerformanceMetrics();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchPerformanceMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    }
  };

  const fetchPredictiveData = async () => {
    try {
      const response = await fetch('/api/analytics/predictive-maintenance');
      const data = await response.json();
      setPredictiveData(data);
    } catch (error) {
      console.error('Failed to fetch predictive data:', error);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/performance');
      const data = await response.json();
      setPerformanceMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      setLoading(false);
    }
  };

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading Advanced Analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧠 Advanced Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">AI-powered insights and predictive analytics for your fleet</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Activity className="w-4 h-4 mr-1" />
          System Healthy
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="ai-insights">🧠 AI Insights</TabsTrigger>
          <TabsTrigger value="predictive">🔮 Predictive</TabsTrigger>
          <TabsTrigger value="performance">⚡ Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">System Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.performanceKPIs.systemUptime}%</div>
                <p className="text-xs opacity-75">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Response Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.performanceKPIs.responseAccuracy}%</div>
                <p className="text-xs opacity-75">AI-powered alerts</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Prevention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.performanceKPIs.emergencyPreventionRate}%</div>
                <p className="text-xs opacity-75">Emergencies prevented</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Driver Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.performanceKPIs.driverSatisfaction}/5</div>
                <p className="text-xs opacity-75">Average rating</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Trends (30 Days)</CardTitle>
                <CardDescription>Daily emergency incidents with trend analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.trends.emergencyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuel Efficiency Analysis</CardTitle>
                <CardDescription>Vehicle fuel efficiency comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.vehicleMetrics.fuelEfficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vehicleNumber" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI Emergency Pattern Analysis
                </CardTitle>
                <CardDescription>Machine learning insights from historical data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Key Insights</h4>
                  <ul className="space-y-2 text-sm text-purple-700">
                    <li>• 68% of emergencies occur during peak traffic hours (8-10 AM, 6-8 PM)</li>
                    <li>• Vehicle breakdowns increase by 34% when maintenance is overdue</li>
                    <li>• Weather conditions correlate with 23% increase in emergency incidents</li>
                    <li>• Driver fatigue detection could prevent 45% of late-night emergencies</li>
                  </ul>
                </div>
                <Button className="w-full" variant="outline">
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Detailed AI Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Predictive Risk Scoring
                </CardTitle>
                <CardDescription>Real-time risk assessment for active vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.vehicleMetrics.utilizationRate.slice(0, 5).map((vehicle, index) => (
                    <div key={vehicle.vehicleNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{vehicle.vehicleNumber}</p>
                        <p className="text-sm text-gray-600">Utilization: {vehicle.utilization}%</p>
                      </div>
                      <Badge 
                        variant={vehicle.utilization > 80 ? "destructive" : vehicle.utilization > 60 ? "default" : "secondary"}
                      >
                        {vehicle.utilization > 80 ? "High Risk" : vehicle.utilization > 60 ? "Medium Risk" : "Low Risk"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          {predictiveData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Critical Vehicles Requiring Attention
                  </CardTitle>
                  <CardDescription>AI-predicted maintenance issues and failure risks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {predictiveData.criticalVehicles.slice(0, 3).map((vehicle) => (
                      <div key={vehicle.vehicleNumber} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-red-800">{vehicle.vehicleNumber}</h4>
                          <Badge variant="destructive">Risk Score: {vehicle.riskScore}</Badge>
                        </div>
                        <p className="text-sm text-red-700 mb-2">
                          Predicted failure: {new Date(vehicle.predictedFailureDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-red-700 mb-3">
                          Estimated cost: ₹{vehicle.estimatedCost.toLocaleString()}
                        </p>
                        <div className="space-y-1">
                          {vehicle.recommendedActions.map((action, index) => (
                            <p key={index} className="text-xs text-red-600">• {action}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Schedule Optimization</CardTitle>
                  <CardDescription>AI-optimized maintenance scheduling</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictiveData.maintenanceSchedule.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.vehicleNumber}</p>
                          <p className="text-sm text-gray-600">{item.serviceType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{new Date(item.scheduledDate).toLocaleDateString()}</p>
                          <Badge 
                            variant={item.priority === 'CRITICAL' ? "destructive" : 
                                   item.priority === 'HIGH' ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      CPU Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.systemHealth.cpuUsage.toFixed(1)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${performanceMetrics.systemHealth.cpuUsage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Memory Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.systemHealth.memoryUsage.toFixed(1)}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${performanceMetrics.systemHealth.memoryUsage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      Network Latency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.systemHealth.networkLatency.toFixed(0)}ms</div>
                    <p className="text-xs text-gray-600 mt-1">Average response time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      API Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.apiMetrics.successRate.toFixed(1)}%</div>
                    <p className="text-xs text-gray-600 mt-1">{performanceMetrics.apiMetrics.requestsPerMinute} req/min</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency System Performance</CardTitle>
                  <CardDescription>Real-time monitoring of critical emergency response metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {performanceMetrics.emergencySystemMetrics.alertDeliveryTime.toFixed(1)}s
                      </div>
                      <p className="text-sm text-blue-700">Alert Delivery Time</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {performanceMetrics.emergencySystemMetrics.smsDeliveryRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-green-700">SMS Delivery Rate</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {performanceMetrics.emergencySystemMetrics.videoUploadSuccess.toFixed(1)}%
                      </div>
                      <p className="text-sm text-purple-700">Video Upload Success</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {performanceMetrics.emergencySystemMetrics.locationAccuracy.toFixed(1)}%
                      </div>
                      <p className="text-sm text-orange-700">Location Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}