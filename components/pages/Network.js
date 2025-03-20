"use strict";
import { h, html, useState, useEffect } from "../../bundle.js";
import { Icons, Button } from "../Components.js";

function Network() {
  const [networkConfig, setNetworkConfig] = useState({
    ip: "192.168.1.100",
    sm: "255.255.255.0",
    gw: "192.168.1.1",
    d1: "8.8.8.8",
    d2: "8.8.4.4",
    dh: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editConfig, setEditConfig] = useState(networkConfig);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchNetworkConfig = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/network/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch network configuration: ${response.statusText}`
        );
      }

      const data = await response.json();
      setNetworkConfig(data);
      setEditConfig(data);
    } catch (error) {
      console.error("Error fetching network configuration:", error);
      setLoadError(error.message || "Failed to load network configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateIpAddress = (ip) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    return ip
      .split(".")
      .every((num) => parseInt(num) >= 0 && parseInt(num) <= 255);
  };

  const validateSubnetMask = (mask) => {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(mask)) return false;

    // Convert to binary
    const binary = mask
      .split(".")
      .map((num) => parseInt(num).toString(2).padStart(8, "0"))
      .join("");

    // Check if it's a valid subnet mask (all 1s followed by all 0s)
    return /^1*0*$/.test(binary);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate IP Address
    if (!validateIpAddress(editConfig.ip)) {
      newErrors.ip = "Please enter a valid IP address (e.g., 192.168.1.100)";
    }

    // Validate Subnet Mask
    if (!validateSubnetMask(editConfig.sm)) {
      newErrors.sm = "Please enter a valid subnet mask (e.g., 255.255.255.0)";
    }

    // Validate Gateway
    if (!validateIpAddress(editConfig.gw)) {
      newErrors.gw = "Please enter a valid gateway IP address";
    }

    // Validate DNS servers
    if (!validateIpAddress(editConfig.d1)) {
      newErrors.d1 = "Please enter a valid primary DNS IP address";
    }
    if (!validateIpAddress(editConfig.d2)) {
      newErrors.d2 = "Please enter a valid secondary DNS IP address";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/network/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editConfig),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save network configuration: ${response.statusText}`
        );
      }

      // Call reboot API after successful save
      const rebootResponse = await fetch("/api/reboot/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!rebootResponse.ok) {
        throw new Error("Failed to reboot server");
      }

      const data = await response.json();
      setNetworkConfig(editConfig);
      setIsEditing(false);
      setErrors({});
      setSaveSuccess(true);

      // Show success message and update UI
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      // Refresh page after a delay to allow server to reboot
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error) {
      console.error("Error saving network configuration:", error);
      setSaveError(error.message || "Failed to save network configuration");
      setIsSaving(false);
    }
  };

  useEffect(() => {
    document.title = "SBIOT-Network";
    fetchNetworkConfig();
  }, []);

  if (isLoading) {
    return html`
      <div class="p-6">
        <h1 class="text-2xl font-bold mb-6">Network Configuration</h1>
        <div
          class="bg-white rounded-lg shadow-md p-6 flex items-center justify-center"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span class="text-gray-600">Loading network configuration...</span>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Network Configuration</h1>

      ${loadError &&
      html`
        <div
          class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between"
        >
          <div>${loadError}</div>
          <button
            onClick=${fetchNetworkConfig}
            class="px-3 py-1 bg-red-200 hover:bg-red-300 rounded-md text-red-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      `}
      ${saveError &&
      html`
        <div
          class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          ${saveError}
        </div>
      `}
      ${saveSuccess &&
      html`
        <div
          class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded"
        >
          Network configuration saved successfully! System will reboot to apply
          changes...
        </div>
      `}

      <div class="bg-white rounded-lg shadow-md p-6">
        ${isEditing
          ? html`
              <form onSubmit=${handleSubmit} class="space-y-4">
                <div class="flex items-center mb-4">
                  <label class="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="dh"
                      checked=${editConfig.dh}
                      onChange=${handleInputChange}
                      class="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span class="ml-2 text-gray-700">Enable DHCP</span>
                  </label>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      IP Address
                    </label>
                    <input
                      type="text"
                      name="ip"
                      value=${editConfig.ip}
                      onChange=${handleInputChange}
                      disabled=${editConfig.dh}
                      class="w-full px-3 py-2 border ${errors.ip
                        ? "border-red-500"
                        : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="192.168.1.100"
                    />
                    ${errors.ip
                      ? html`<p class="mt-1 text-sm text-red-500">
                          ${errors.ip}
                        </p>`
                      : ""}
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Subnet Mask
                    </label>
                    <input
                      type="text"
                      name="sm"
                      value=${editConfig.sm}
                      onChange=${handleInputChange}
                      disabled=${editConfig.dh}
                      class="w-full px-3 py-2 border ${errors.sm
                        ? "border-red-500"
                        : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="255.255.255.0"
                    />
                    ${errors.sm
                      ? html`<p class="mt-1 text-sm text-red-500">
                          ${errors.sm}
                        </p>`
                      : ""}
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Gateway
                    </label>
                    <input
                      type="text"
                      name="gw"
                      value=${editConfig.gw}
                      onChange=${handleInputChange}
                      disabled=${editConfig.dh}
                      class="w-full px-3 py-2 border ${errors.gw
                        ? "border-red-500"
                        : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="192.168.1.1"
                    />
                    ${errors.gw
                      ? html`<p class="mt-1 text-sm text-red-500">
                          ${errors.gw}
                        </p>`
                      : ""}
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Primary DNS
                    </label>
                    <input
                      type="text"
                      name="d1"
                      value=${editConfig.d1}
                      onChange=${handleInputChange}
                      disabled=${editConfig.dh}
                      class="w-full px-3 py-2 border ${errors.d1
                        ? "border-red-500"
                        : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="8.8.8.8"
                    />
                    ${errors.d1
                      ? html`<p class="mt-1 text-sm text-red-500">
                          ${errors.d1}
                        </p>`
                      : ""}
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Secondary DNS
                    </label>
                    <input
                      type="text"
                      name="d2"
                      value=${editConfig.d2}
                      onChange=${handleInputChange}
                      disabled=${editConfig.dh}
                      class="w-full px-3 py-2 border ${errors.d2
                        ? "border-red-500"
                        : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="8.8.4.4"
                    />
                    ${errors.d2
                      ? html`<p class="mt-1 text-sm text-red-500">
                          ${errors.d2}
                        </p>`
                      : ""}
                  </div>
                </div>

                <div class="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick=${() => {
                      setIsEditing(false);
                      setErrors({});
                      setSaveError("");
                    }}
                    class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled=${isSaving}
                  >
                    Cancel
                  </button>
                  <${Button}
                    onClick=${handleSubmit}
                    disabled=${isSaving}
                    loading=${isSaving}
                    icon="SaveIcon"
                  >
                    ${isSaving ? "Saving..." : "Save Changes"}
                  <//>
                </div>
              </form>
            `
          : html`
              <div class="space-y-4">
                <div class="flex justify-between items-center mb-6">
                  <div class="text-xl font-semibold">Network Settings</div>
                  <button
                    onClick=${() => {
                      setEditConfig(networkConfig);
                      setIsEditing(true);
                    }}
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Settings
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-medium text-gray-500">
                      DHCP Status
                    </div>
                    <div class="mt-1">
                      ${networkConfig.dh ? "Enabled" : "Disabled"}
                    </div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-500">
                      IP Address
                    </div>
                    <div class="mt-1">${networkConfig.ip}</div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-500">
                      Subnet Mask
                    </div>
                    <div class="mt-1">${networkConfig.sm}</div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-500">Gateway</div>
                    <div class="mt-1">${networkConfig.gw}</div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-500">
                      Primary DNS
                    </div>
                    <div class="mt-1">${networkConfig.d1}</div>
                  </div>

                  <div>
                    <div class="text-sm font-medium text-gray-500">
                      Secondary DNS
                    </div>
                    <div class="mt-1">${networkConfig.d2}</div>
                  </div>
                </div>
              </div>
            `}
      </div>
    </div>
  `;
}

export default Network;
