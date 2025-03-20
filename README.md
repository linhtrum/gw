# SBIOT Dashboard

A real-time IoT dashboard for monitoring and managing devices, temperature, and humidity sensors.

## Features

- Real-time device monitoring via WebSocket
- Device management and configuration
- Temperature and humidity sensor tracking
- Customizable display cards
- Network configuration
- System settings management
- Responsive and modern UI

## Technical Stack

- Frontend: Preact
- WebSocket for real-time updates
- RESTful API for configuration
- Tailwind CSS for styling

## WebSocket Communication

The application maintains a persistent WebSocket connection to receive real-time updates from devices:

```javascript
ws://localhost:8080/websocket
```

The server automatically pushes updates for all devices. No subscription required.

### WebSocket Message Format

Incoming message format:

```json
// Temperature update
{
  "type": "update",
  "cardId": "string",
  "temperature": number
}

// Humidity update
{
  "type": "update",
  "cardId": "string",
  "humidity": number
}
```

## API Endpoints

### Authentication

- `POST /api/login` - User authentication
  ```json
  // Request
  {
    "username": "string",
    "password": "string"
  }
  ```

### Device Management

- `GET /api/devices/get` - Retrieve list of all devices

  ```json
  [
    {
      "n": "Device Name",
      "da": "Device Address",
      "ns": [
        {
          "n": "Node Name",
          "a": "Node Address",
          "f": "Function",
          "dt": "Data Type",
          "t": "Type",
          "value": number
        }
      ]
    }
  ]
  ```

- `POST /api/devices/set` - Update device configuration
  ```json
  {
    "devices": [
      {
        "n": "Device Name",
        "da": "Device Address",
        "ns": [
          {
            "n": "Node Name",
            "a": "Node Address",
            "f": "Function",
            "dt": "Data Type",
            "t": "Type"
          }
        ]
      }
    ]
  }
  ```

### Home Dashboard

- `GET /api/home/get` - Get dashboard card configurations

  ```json
  [
    {
      "id": "number",
      "t": "Card Title",
      "dn": "Device Name",
      "tn": {
        "n": "Temperature Node Name",
        "a": "Node Address",
        "f": "Function",
        "dt": "Data Type",
        "t": "Type",
        "v": number
      },
      "hn": {
        "n": "Humidity Node Name",
        "a": "Node Address",
        "f": "Function",
        "dt": "Data Type",
        "t": "Type",
        "v": number
      },
      "lastUpdate": "Date"
    }
  ]
  ```

- `POST /api/home/set` - Save dashboard card configurations
  ```json
  [
    {
      "t": "Card Title",
      "dn": "Device Name",
      "tn": {
        "n": "Temperature Node Name",
        "a": "Node Address",
        "f": "Function",
        "dt": "Data Type",
        "t": "Type"
      },
      "hn": {
        "n": "Humidity Node Name",
        "a": "Node Address",
        "f": "Function",
        "dt": "Data Type",
        "t": "Type"
      }
    }
  ]
  ```

### System Configuration

- `GET /api/system/get` - Get system settings

  ```json
  {
    "ntp": {
      "enabled": boolean,
      "primary": "string",
      "secondary": "string",
      "tertiary": "string"
    },
    "timezone": number,
    "time": "string"
  }
  ```

- `POST /api/system/set` - Update system settings

  ```json
  {
    "ntp": {
      "enabled": boolean,
      "primary": "string",
      "secondary": "string",
      "tertiary": "string"
    },
    "timezone": number
  }
  ```

- `POST /api/reboot/set` - Trigger system reboot
- `POST /api/factory-reset/set` - Trigger factory reset

### Network Configuration

- `GET /api/network/get` - Get network settings

  ```json
  {
    "dhcp": boolean,
    "ip": "string",
    "subnet": "string",
    "gateway": "string",
    "dns": "string",
    "port": number
  }
  ```

- `POST /api/network/set` - Update network settings
  ```json
  {
    "dhcp": boolean,
    "ip": "string",
    "subnet": "string",
    "gateway": "string",
    "dns": "string",
    "port": number
  }
  ```

## Data Types and Constants

### Data Types

```javascript
const dataTypeMap = [
  [1, "Boolean"],
  [2, "Int16"],
  [3, "Int32"],
  [4, "Float32"],
  [5, "Float64"],
];
```

### Function Types

```javascript
const functionMap = [
  [1, "01 - Read Coils"],
  [2, "02 - Read Discrete Inputs"],
  [3, "03 - Read Holding Registers"],
  [4, "04 - Read Input Registers"],
  [5, "05 - Write Single Coil"],
  [6, "06 - Write Single Register"],
  [15, "15 - Write Multiple Coils"],
  [16, "16 - Write Multiple Registers"],
];
```

### Timezone Options

```javascript
const TIMEZONE_OPTIONS = [
  [1, "UTC-12:00 (Baker Island)"],
  [2, "UTC-11:00 (American Samoa)"],
  [3, "UTC-10:00 (Hawaii)"],
  [4, "UTC-09:00 (Alaska)"],
  [5, "UTC-08:00 (Pacific Time)"],
  [6, "UTC-07:00 (Mountain Time)"],
  [7, "UTC-06:00 (Central Time)"],
  [8, "UTC-05:00 (Eastern Time)"],
  [9, "UTC-04:00 (Atlantic Time)"],
  [10, "UTC-03:00 (Brazil)"],
  [11, "UTC-02:00 (Mid-Atlantic)"],
  [12, "UTC-01:00 (Azores)"],
  [13, "UTC+00:00 (GMT)"],
  [14, "UTC+01:00 (Central European)"],
  [15, "UTC+02:00 (Eastern European)"],
  [16, "UTC+03:00 (Moscow)"],
  [17, "UTC+04:00 (Gulf)"],
  [18, "UTC+05:00 (Pakistan)"],
  [19, "UTC+05:30 (India)"],
  [20, "UTC+06:00 (Bangladesh)"],
  [21, "UTC+07:00 (Indochina)"],
  [22, "UTC+08:00 (China)"],
  [23, "UTC+09:00 (Japan)"],
  [24, "UTC+10:00 (Eastern Australia)"],
  [25, "UTC+11:00 (Solomon Islands)"],
  [26, "UTC+12:00 (New Zealand)"],
];
```

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

### Web Server

- Default port: 8000
- Port range: 1-65535

### Security

- Password requirements:
  - Minimum length: 8 characters
  - Must contain uppercase and lowercase letters
  - Must contain numbers
  - Must contain special characters

## Development

### Component Structure

- `Home.js` - Main dashboard with real-time device monitoring
- `Devices.js` - Device management interface
- `Network.js` - Network configuration
- `System.js` - System settings and maintenance
- `Login.js` - User authentication
- `Components.js` - Shared UI components

### State Management

- Uses React hooks for state management
- WebSocket connection managed via useEffect and refs
- Automatic reconnection on connection loss

## Error Handling

- API error handling with user feedback
- WebSocket connection status monitoring
- Automatic reconnection attempts
- Form validation and error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - See LICENSE file for details
