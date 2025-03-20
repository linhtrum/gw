"use strict";
import { h, html, useState, useEffect } from "../../bundle.js";
import { Icons, Button, Tabs } from "../Components.js";

// Timezone mapping array
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
  [10, "UTC-03:00 (Brasilia)"],
  [11, "UTC-02:00 (South Georgia)"],
  [12, "UTC-01:00 (Azores)"],
  [13, "UTC+00:00 (GMT)"],
  [14, "UTC+01:00 (Central European Time)"],
  [15, "UTC+02:00 (Eastern European Time)"],
  [16, "UTC+03:00 (Moscow)"],
  [17, "UTC+04:00 (Gulf Standard Time)"],
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

function System() {
  const [activeTab, setActiveTab] = useState("user");
  const [systemConfig, setSystemConfig] = useState({
    username: "admin",
    password: "",
    server1: "pool.ntp.org",
    server2: "time.google.com",
    server3: "time.windows.com",
    timezone: 21, // Default to UTC+07:00 (Indochina)
    enabled: true,
    port: 8000,
    time: null,
  });

  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Track original config for comparison
  const [originalConfig, setOriginalConfig] = useState(null);

  const tabs = [
    { id: "user", label: "User Config" },
    { id: "time", label: "Time Settings" },
    { id: "websocket", label: "Web Server Settings" },
    { id: "factory", label: "Factory Reset" },
  ];

  // Fetch all system configuration
  const fetchSystemConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/system/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch system configuration");

      const data = await response.json();

      // Store original config for comparison
      setOriginalConfig(data);

      // Update all configurations from single response
      setSystemConfig({
        username: data.username || "admin",
        password: "", // Don't set password from server
        server1: data.server1 || "pool.ntp.org",
        server2: data.server2 || "time.google.com",
        server3: data.server3 || "time.windows.com",
        timezone: data.timezone || 21,
        enabled: data.enabled ?? true,
        port: data.port || 8000,
        time: data.time ? new Date(data.time) : null,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to load system configuration",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add password validation function
  const validatePassword = (password) => {
    if (!password) return true; // Empty password is valid (no change)

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const requirements = [
      {
        met: password.length >= minLength,
        message: "Password must be at least 8 characters long",
      },
      {
        met: hasUpperCase,
        message: "Password must contain at least one uppercase letter",
      },
      {
        met: hasLowerCase,
        message: "Password must contain at least one lowercase letter",
      },
      {
        met: hasNumbers,
        message: "Password must contain at least one number",
      },
      {
        met: hasSpecialChar,
        message: "Password must contain at least one special character",
      },
    ];

    const failedRequirements = requirements.filter((req) => !req.met);
    return {
      isValid: failedRequirements.length === 0,
      errors: failedRequirements.map((req) => req.message),
    };
  };

  // Save all modified configurations
  const handleSaveConfig = async () => {
    // Validate password if it's being changed
    if (systemConfig.password) {
      const passwordValidation = validatePassword(systemConfig.password);
      if (!passwordValidation.isValid) {
        setMessage({
          type: "error",
          text: passwordValidation.errors.join(", "),
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Prepare the complete configuration update
      const updatedConfig = {
        ...originalConfig,
        username: systemConfig.username,
        ...(systemConfig.password && { password: systemConfig.password }),
        server1: systemConfig.server1,
        server2: systemConfig.server2,
        server3: systemConfig.server3,
        timezone: systemConfig.timezone,
        enabled: systemConfig.enabled,
        port: systemConfig.port,
      };

      const response = await fetch("/api/system/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedConfig),
      });

      if (!response.ok) throw new Error("Failed to save configuration");

      setMessage({
        type: "success",
        text: "Settings updated successfully. System will reboot to apply changes...",
      });

      // Clear password field and refresh configuration
      setSystemConfig((prev) => ({
        ...prev,
        password: "",
      }));

      // Trigger server reboot after successful save
      const rebootResponse = await fetch("/api/reboot/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!rebootResponse.ok) throw new Error("Failed to reboot server");

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to update settings: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle all configuration changes
  const handleConfigChange = (field, value) => {
    // Clear error message when user starts typing a new password
    if (field === "password" && message.type === "error") {
      setMessage({ type: "", text: "" });
    }

    setSystemConfig((prev) => ({
      ...prev,
      [field]: value,
      // handleConfigChange,
    }));
  };

  // Load initial configuration
  useEffect(() => {
    document.title = "SBIOT-System";
    fetchSystemConfig();
  }, []);

  // Format time for display
  const formatTime = (date) => {
    if (!date) return "N/A";
    return date.toLocaleString();
  };

  // Handle factory reset
  const handleFactoryReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset to factory settings? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const response = await fetch("/api/factory/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to perform factory reset");

      setMessage({
        type: "success",
        text: "Factory reset successful. The system will restart...",
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to perform factory reset",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle server reboot
  const handleReboot = async () => {
    if (!confirm("Are you sure you want to reboot the server?")) {
      return;
    }

    setIsRestoring(true);
    try {
      const response = await fetch("/api/reboot/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to reboot server");

      setMessage({
        type: "success",
        text: "Server is rebooting. Please wait...",
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to reboot server",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const renderMessage = () => {
    if (!message.text) return null;
    const bgColor = message.type === "success" ? "bg-green-100" : "bg-red-100";
    const textColor =
      message.type === "success" ? "text-green-800" : "text-red-800";
    return html`
      <div class="mb-4 p-4 rounded-lg ${bgColor} ${textColor}">
        ${message.text}
      </div>
    `;
  };

  return html`
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">System Settings</h1>

      ${renderMessage()}

      <${Tabs}
        tabs=${tabs}
        activeTab=${activeTab}
        onTabChange=${setActiveTab}
      />

      <div class="bg-white rounded-lg shadow-md p-6">
        ${activeTab === "user" &&
        html`
          <div class="space-y-6">
            <!-- User Profile Section -->
            <div class="bg-white border rounded-lg p-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">
                User Profile
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <div class="flex items-center space-x-2">
                    <input
                      type="text"
                      value=${systemConfig.username}
                      onChange=${(e) =>
                        handleConfigChange("username", e.target.value)}
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span class="text-sm text-gray-500">(3-20 characters)</span>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value=${systemConfig.password}
                    onChange=${(e) =>
                      handleConfigChange("password", e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              </div>
            </div>

            <!-- Password Requirements -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-700 mb-2">
                Password Requirements
              </h3>
              <ul class="text-sm text-gray-600 space-y-1">
                <li>• Minimum 8 characters long</li>
                <li>• Must contain at least one uppercase letter</li>
                <li>• Must contain at least one lowercase letter</li>
                <li>• Must contain at least one number</li>
                <li>• Must contain at least one special character</li>
              </ul>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end pt-4 border-t">
              <${Button}
                onClick=${handleSaveConfig}
                disabled=${isSaving}
                loading=${isSaving}
                icon="SaveIcon"
              >
                ${isSaving ? "Saving..." : "Save Changes"}
              <//>
            </div>
          </div>
        `}
        ${activeTab === "time" &&
        html`
          <div class="space-y-6">
            <!-- NTP Settings -->
            <div class="bg-white border rounded-lg p-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">
                NTP Configuration
              </h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Primary NTP Server
                  </label>
                  <input
                    type="text"
                    value=${systemConfig.server1}
                    onChange=${(e) =>
                      handleConfigChange("server1", e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Secondary NTP Server
                  </label>
                  <input
                    type="text"
                    value=${systemConfig.server2}
                    onChange=${(e) =>
                      handleConfigChange("server2", e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Tertiary NTP Server
                  </label>
                  <input
                    type="text"
                    value=${systemConfig.server3}
                    onChange=${(e) =>
                      handleConfigChange("server3", e.target.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value=${systemConfig.timezone}
                    onChange=${(e) =>
                      handleConfigChange("timezone", parseInt(e.target.value))}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    ${TIMEZONE_OPTIONS.map(
                      (tz) => html` <option value=${tz[0]}>${tz[1]}</option> `
                    )}
                  </select>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    checked=${systemConfig.enabled}
                    onChange=${(e) =>
                      handleConfigChange("enabled", e.target.checked)}
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label class="ml-2 block text-sm text-gray-700">
                    Enable NTP Synchronization
                  </label>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end pt-4 border-t">
              <${Button}
                onClick=${handleSaveConfig}
                disabled=${isSaving}
                loading=${isSaving}
                icon="SaveIcon"
              >
                ${isSaving ? "Saving..." : "Save Changes"}
              <//>
            </div>
          </div>
        `}
        ${activeTab === "websocket" &&
        html`
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Web Server Port
              </label>
              <div class="flex items-center space-x-2">
                <input
                  type="number"
                  value=${systemConfig.port}
                  onChange=${(e) =>
                    handleConfigChange("port", parseInt(e.target.value))}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="65535"
                  required
                />
                <span class="text-sm text-gray-500">(1-65535)</span>
              </div>
              <p class="mt-1 text-sm text-gray-500">
                The port number for the web server interface. Default is 8000.
              </p>
            </div>

            <!-- Warning Message -->
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg
                    class="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-yellow-700">
                    Note: Changing the web server port will require you to
                    reconnect using the new port number.
                  </p>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end pt-4 border-t">
              <${Button}
                onClick=${handleSaveConfig}
                disabled=${isSaving}
                loading=${isSaving}
                icon="SaveIcon"
              >
                ${isSaving ? "Saving..." : "Save Changes"}
              <//>
            </div>
          </div>
        `}
        ${activeTab === "factory" &&
        html`
          <div class="space-y-6">
            <!-- Warning Message -->
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg
                    class="h-5 w-5 text-yellow-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-yellow-700">
                    Warning: Restoring factory settings will erase all
                    configurations and cannot be undone. This action will:
                  </p>
                  <ul
                    class="mt-2 text-sm text-yellow-700 list-disc list-inside"
                  >
                    <li>Reset all device settings to default values</li>
                    <li>Clear all user configurations</li>
                    <li>Restart the device</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end space-x-4">
              <${Button}
                onClick=${handleReboot}
                disabled=${isRestoring}
                loading=${isRestoring}
                variant="warning"
                icon="RefreshIcon"
              >
                ${isRestoring ? "Rebooting..." : "Reboot Server"}
              <//>
              <${Button}
                onClick=${handleFactoryReset}
                disabled=${isRestoring}
                loading=${isRestoring}
                variant="danger"
                icon="ResetIcon"
              >
                ${isRestoring ? "Restoring..." : "Restore Factory Settings"}
              <//>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

export default System;
