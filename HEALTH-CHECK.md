# Health Check Endpoint

## Overview

The Slack Question Router includes a built-in HTTP health check endpoint for monitoring application health. This endpoint runs alongside the Socket Mode Slack bot and provides real-time status information about all critical components.

---

## Endpoint

```
GET http://localhost:3000/health
```

The port can be configured via the `HEALTH_CHECK_PORT` environment variable (default: 3000).

---

## Response Format

### Healthy Response (200 OK)

```json
{
  "status": "healthy",
  "uptime": 3600.5,
  "timestamp": "2025-11-13T12:34:56.789Z",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 12
    },
    "slack": {
      "status": "connected",
      "workspace": "My Workspace",
      "botUser": "questionrouter"
    },
    "escalationEngine": {
      "status": "running"
    }
  }
}
```

### Degraded Response (503 Service Unavailable)

```json
{
  "status": "degraded",
  "uptime": 120.3,
  "timestamp": "2025-11-13T12:35:00.000Z",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 45
    },
    "slack": {
      "status": "connected",
      "workspace": "My Workspace",
      "botUser": "questionrouter"
    },
    "escalationEngine": {
      "status": "stopped"
    }
  }
}
```

### Unhealthy Response (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "uptime": 60.1,
  "timestamp": "2025-11-13T12:36:00.000Z",
  "checks": {
    "database": {
      "status": "down",
      "error": "Connection refused"
    },
    "slack": {
      "status": "disconnected",
      "error": "Authentication failed"
    },
    "escalationEngine": {
      "status": "stopped"
    }
  }
}
```

---

## Status Levels

### `healthy` (HTTP 200)
All systems operational:
- ✅ Database connected and responding
- ✅ Slack connection active
- ✅ Escalation engine running

### `degraded` (HTTP 503)
Critical systems working but some issues:
- ✅ Database and Slack connected
- ⚠️ Escalation engine stopped (questions won't escalate)

### `unhealthy` (HTTP 503)
Critical systems failing:
- ❌ Database connection failed
- ❌ Slack connection lost
- ❌ Cannot process questions

---

## Monitored Components

### 1. Database Check
- **What it checks:** PostgreSQL connectivity via Prisma
- **Test:** Executes `SELECT 1` query
- **Metrics:** Response time in milliseconds
- **Failure:** Connection refused, timeout, authentication error

### 2. Slack Connection Check
- **What it checks:** Slack API connectivity
- **Test:** Calls `auth.test()` API method
- **Metrics:** Workspace name, bot user
- **Failure:** Network error, invalid token, API error

### 3. Escalation Engine Check
- **What it checks:** Whether escalation engine is running
- **Test:** Internal status flag
- **Metrics:** Running or stopped
- **Note:** Engine stops during graceful shutdown

---

## Use Cases

### 1. Uptime Monitoring

**Tools:** UptimeRobot, Pingdom, StatusCake, etc.

```bash
# Configure monitor
URL: http://your-server.com:3000/health
Method: GET
Expected Status: 200
Check Interval: 60 seconds
```

The monitor will alert you when:
- Status code changes from 200 to 503
- Endpoint becomes unreachable
- Response time exceeds threshold

### 2. Load Balancer Health Checks

**Platforms:** AWS ELB, Google Cloud Load Balancer, nginx

```nginx
# nginx upstream configuration
upstream question_router {
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
}

# Health check
location /health {
    proxy_pass http://question_router/health;
    proxy_connect_timeout 5s;
    proxy_read_timeout 5s;
}
```

### 3. Container Orchestration

**Kubernetes:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: question-router
    image: question-router:latest
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2
```

**Docker Compose:**

```yaml
services:
  question-router:
    image: question-router:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 4. CI/CD Deployment Verification

**Example:** Verify deployment before completing

```bash
#!/bin/bash
# deploy.sh

echo "Deploying application..."
pm2 restart question-router

echo "Waiting for application to start..."
sleep 10

echo "Checking health..."
for i in {1..30}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

    if [ "$response" = "200" ]; then
        echo "✅ Deployment successful! Application is healthy."
        exit 0
    fi

    echo "Waiting for health check... ($i/30)"
    sleep 2
done

echo "❌ Deployment failed! Application did not become healthy."
exit 1
```

### 5. Monitoring Dashboard

**Prometheus + Grafana:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'question-router'
    metrics_path: '/health'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:3000']
```

---

## Testing the Endpoint

### Using curl

```bash
# Basic check
curl http://localhost:3000/health

# Pretty print JSON
curl -s http://localhost:3000/health | jq

# Check status code only
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health

# Include timing information
curl -w "@curl-format.txt" -s http://localhost:3000/health
```

### Using httpie

```bash
# Install: pip install httpie
http GET http://localhost:3000/health
```

### Using Node.js

```javascript
const http = require('http');

http.get('http://localhost:3000/health', (res) => {
  let data = '';

  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const health = JSON.parse(data);
    console.log(`Status: ${health.status}`);
    console.log(`Database: ${health.checks.database.status}`);
    console.log(`Slack: ${health.checks.slack.status}`);
  });
});
```

---

## Configuration

### Environment Variable

```bash
# .env
HEALTH_CHECK_PORT=3000
```

### Custom Port

If port 3000 is already in use:

```bash
# Use a different port
HEALTH_CHECK_PORT=8080

# Access health check
curl http://localhost:8080/health
```

### Firewall Configuration

**Allow health check port:**

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

**Security Note:** Only expose the health check port to:
- Your monitoring service IP
- Load balancer internal network
- Internal company network

Do NOT expose it to the public internet.

---

## Troubleshooting

### Health Check Returns 503

**Possible causes:**

1. **Database down:**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Slack connection lost:**
   ```bash
   # Verify tokens in .env
   # Check Slack API status: https://status.slack.com
   ```

3. **Escalation engine stopped:**
   - Check application logs for errors
   - Restart the application

### Health Check Unreachable

**Possible causes:**

1. **Port not open:**
   ```bash
   # Check if port is listening
   netstat -tuln | grep 3000
   ```

2. **Firewall blocking:**
   ```bash
   # Test from same server
   curl http://localhost:3000/health

   # Test from different server
   curl http://your-server-ip:3000/health
   ```

3. **Application not started:**
   ```bash
   # Check if app is running
   pm2 list
   # or
   ps aux | grep node
   ```

### Slow Response Time

If database response time > 100ms:

1. Check database server load
2. Verify network latency
3. Review database connection pool settings
4. Consider database optimization

---

## Security Considerations

### 1. Sensitive Information

The health check endpoint does NOT expose:
- ❌ Database credentials
- ❌ Slack tokens
- ❌ User data
- ❌ Question content

It DOES expose:
- ✅ Workspace name (public info)
- ✅ Bot username (public info)
- ✅ Component status (up/down)

### 2. Access Control

**Production recommendation:**

```nginx
# Restrict health check to internal IPs only
location /health {
    allow 10.0.0.0/8;        # Internal network
    allow 172.16.0.0/12;     # Load balancer network
    allow 192.168.0.0/16;    # Private network
    deny all;                # Deny everyone else

    proxy_pass http://question_router/health;
}
```

### 3. Rate Limiting

Prevent abuse with rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=health:10m rate=1r/s;

location /health {
    limit_req zone=health burst=5;
    proxy_pass http://question_router/health;
}
```

---

## Performance

### Response Time

- **Expected:** < 50ms (database + Slack check)
- **Warning:** 50-100ms (check database performance)
- **Critical:** > 100ms (investigate immediately)

### Resource Usage

The health check endpoint is lightweight:
- **Memory:** < 1MB additional
- **CPU:** < 0.1% during checks
- **Database:** 1 simple query per check
- **Network:** 1 Slack API call per check

### Caching

Health checks are **not cached** to ensure real-time status. Each request performs fresh checks.

---

## Monitoring Best Practices

1. **Check frequently:** Every 30-60 seconds
2. **Set appropriate timeouts:** 5-10 seconds
3. **Configure retries:** 2-3 attempts before alerting
4. **Monitor trends:** Track response time over time
5. **Set up alerts:** Notify on-call when unhealthy
6. **Test failover:** Verify monitoring catches failures

---

## Future Enhancements

Potential improvements (not yet implemented):

- [ ] Metrics endpoint (Prometheus format)
- [ ] Custom health check plugins
- [ ] Health history API
- [ ] Detailed component metrics
- [ ] Authentication for health endpoint
- [ ] WebSocket connection status
- [ ] Queue depth monitoring

---

## Summary

The health check endpoint provides:

✅ **Comprehensive monitoring** of all critical components
✅ **Standard HTTP interface** compatible with all monitoring tools
✅ **Real-time status** with no caching
✅ **Detailed diagnostics** when components fail
✅ **Production-ready** with proper status codes

Use it for uptime monitoring, load balancing, deployment verification, and operational visibility.
