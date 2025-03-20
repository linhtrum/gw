"use strict";
import { h, html, useState, useEffect } from "../../bundle.js";
import { Icons, Button } from "../Components.js";

function Devices() {
  const MAX_DEVICES = 128;
  const MAX_TOTAL_NODES = 300;
  const MAX_NAME_LENGTH = 20;
  const MIN_POLLING_INTERVAL = 10;
  const MAX_POLLING_INTERVAL = 65535;
  const MIN_TIMEOUT = 10;
  const MAX_TIMEOUT = 65535;

  // Add dataType mapping
  const dataTypeMap = [
    [1, "Boolean"],
    [2, "Int8"],
    [3, "UInt8"],
    [4, "Int16"],
    [5, "UInt16"],
    [6, "Int32 (ABCD)"],
    [7, "Int32 (CDAB)"],
    [8, "UInt32 (ABCD)"],
    [9, "UInt32 (CDAB)"],
    [10, "Float (ABCD)"],
    [11, "Float (CDAB)"],
    [12, "Double"],
  ];

  // Add functionMap
  const functionMap = [
    [1, "01 - Read Coils"],
    [2, "02 - Read Discrete Inputs"],
    [3, "03 - Read Holding Registers"],
    [4, "04 - Read Input Registers"],
  ];

  // Add activeTab state
  const [activeTab, setActiveTab] = useState("device-config");

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchDeviceConfig = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/devices/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch device configuration: ${response.statusText}`
        );
      }

      const data = await response.json();
      setDevices(data || []);
      setSelectedDevice(data.length > 0 ? 0 : null);
    } catch (error) {
      console.error("Error fetching device configuration:", error);
      setLoadError(error.message || "Failed to load device configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const saveDeviceConfig = async () => {
    try {
      setIsSaving(true);
      setSaveError("");
      setSaveSuccess(false);

      const config = devices.map((device) => ({
        n: device.n,
        da: device.da,
        pi: device.pi,
        g: device.g,
        ns: device.ns.map((node) => ({
          n: node.n,
          a: node.a,
          f: node.f,
          dt: node.dt,
          t: node.t,
        })),
      }));

      const response = await fetch("/api/devices/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save device configuration: ${response.statusText}`
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

      setSaveSuccess(true);
      setIsSaving(false);

      // Show success message and update UI
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      // Refresh page after a delay to allow server to reboot
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (error) {
      console.error("Error saving device configuration:", error);
      setSaveError(error.message || "Failed to save device configuration");
      setIsSaving(false);
    }
  };

  const [newDevice, setNewDevice] = useState({
    n: "",
    da: 1,
    pi: 1000,
    g: false,
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);

  // Node state
  const [newNode, setNewNode] = useState({
    n: "",
    a: 1,
    f: 1,
    dt: "",
    t: 1000,
  });

  const [editingNodeIndex, setEditingNodeIndex] = useState(null);
  const [editingNode, setEditingNode] = useState(null);

  // Add state for managing add device form visibility
  const [isAddingDevice, setIsAddingDevice] = useState(false);

  const Th = (props) =>
    html`<th
      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
    >
      ${props.children}
    </th>`;
  const Td = (props) =>
    html`<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      ${props.children}
    </td>`;

  const isDeviceNameUnique = (name, excludeIndex = -1) => {
    return !devices.some(
      (device, index) =>
        index !== excludeIndex && device.n.toLowerCase() === name.toLowerCase()
    );
  };

  const isNodeNameUnique = (name, deviceIndex, excludeNodeIndex = -1) => {
    if (!devices[deviceIndex] || !devices[deviceIndex].ns) return true;
    return !devices[deviceIndex].ns.some(
      (node, index) =>
        index !== excludeNodeIndex &&
        node.n.toLowerCase() === name.toLowerCase()
    );
  };

  // Add new function to check node name uniqueness across all devices
  const isNodeNameUniqueAcrossDevices = (
    name,
    excludeDeviceIndex = -1,
    excludeNodeIndex = -1
  ) => {
    return !devices.some((device, deviceIndex) => {
      // Skip the excluded device
      if (deviceIndex === excludeDeviceIndex) return false;

      // Check nodes in current device
      return device.ns?.some((node, nodeIndex) => {
        // Skip the excluded node
        if (
          deviceIndex === excludeDeviceIndex &&
          nodeIndex === excludeNodeIndex
        )
          return false;
        return node.n.toLowerCase() === name.toLowerCase();
      });
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Add validation for modbus address (1-247)
    if (name === "da") {
      const numValue = parseInt(value);
      if (value !== "" && (isNaN(numValue) || numValue < 1 || numValue > 247)) {
        alert("Modbus address must be between 1 and 247");
        return;
      }
      setNewDevice((prev) => ({
        ...prev,
        [name]: numValue,
      }));
      return;
    }

    // Add validation for polling interval (10-65535 ms)
    if (name === "pi") {
      const numValue = parseInt(value);
      if (
        value !== "" &&
        (isNaN(numValue) ||
          numValue < MIN_POLLING_INTERVAL ||
          numValue > MAX_POLLING_INTERVAL)
      ) {
        alert(
          `Polling interval must be between ${MIN_POLLING_INTERVAL} and ${MAX_POLLING_INTERVAL} ms`
        );
        return;
      }
      setNewDevice((prev) => ({
        ...prev,
        [name]: numValue,
      }));
      return;
    }

    // Add validation for name length
    if (name === "n" && value.length > MAX_NAME_LENGTH) {
      alert(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }

    setNewDevice((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;

    // Add validation for modbus address (1-247)
    if (name === "da") {
      const numValue = parseInt(value);
      if (value !== "" && (isNaN(numValue) || numValue < 1 || numValue > 247)) {
        alert("Modbus address must be between 1 and 247");
        return;
      }
    }

    // Add validation for polling interval (10-65535 ms)
    if (name === "pi") {
      const numValue = parseInt(value);
      if (
        value !== "" &&
        (isNaN(numValue) ||
          numValue < MIN_POLLING_INTERVAL ||
          numValue > MAX_POLLING_INTERVAL)
      ) {
        alert(
          `Polling interval must be between ${MIN_POLLING_INTERVAL} and ${MAX_POLLING_INTERVAL} ms`
        );
        return;
      }
    }

    // Add validation for name length
    if (name === "n" && value.length > MAX_NAME_LENGTH) {
      alert(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }

    setEditingDevice((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNodeInputChange = (e) => {
    const { name, value } = e.target;

    // Add validation for name length
    if (name === "n" && value.length > MAX_NAME_LENGTH) {
      alert(`Node name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }

    // Handle integer fields
    if (["a", "f", "t"].includes(name)) {
      const numValue = parseInt(value);
      if (value !== "") {
        if (
          name === "t" &&
          (isNaN(numValue) || numValue < MIN_TIMEOUT || numValue > MAX_TIMEOUT)
        ) {
          alert(`Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} ms`);
          return;
        }
        setNewNode((prev) => ({
          ...prev,
          [name]: numValue,
        }));
      }
      return;
    }

    setNewNode((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (devices.length >= MAX_DEVICES) {
      alert(
        `Maximum number of devices (${MAX_DEVICES}) reached. Cannot add more devices.`
      );
      return;
    }

    if (!newDevice.n || !newDevice.da || !newDevice.pi) {
      alert("Please fill in all fields");
      return;
    }

    if (!isDeviceNameUnique(newDevice.n)) {
      alert(
        "A device with this name already exists. Please use a unique name."
      );
      return;
    }

    setDevices((prev) => [...prev, { ...newDevice, ns: [] }]);
    setNewDevice({
      n: "",
      da: 1,
      pi: 1000,
      g: false,
    });
  };

  // Calculate total nodes across all devices
  const getTotalNodes = () => {
    return devices.reduce(
      (total, device) => total + (device.ns?.length || 0),
      0
    );
  };

  const handleNodeSubmit = (e) => {
    e.preventDefault();
    if (selectedDevice === null) return;

    const totalNodes = getTotalNodes();
    if (totalNodes >= MAX_TOTAL_NODES) {
      alert(
        `Maximum total number of nodes (${MAX_TOTAL_NODES}) reached across all devices. Cannot add more nodes.`
      );
      return;
    }

    if (!newNode.n || !newNode.a || !newNode.f || !newNode.dt || !newNode.t) {
      alert("Please fill in all node fields");
      return;
    }

    // Check if node name is unique across all devices
    if (!isNodeNameUniqueAcrossDevices(newNode.n)) {
      alert(
        "A node with this name already exists in any device. Please use a unique name."
      );
      return;
    }

    const updatedDevices = devices.map((device, index) => {
      if (index === selectedDevice) {
        return {
          ...device,
          ns: [...(device.ns || []), { ...newNode }],
        };
      }
      return device;
    });

    setDevices(updatedDevices);
    setNewNode({
      n: "",
      a: 1,
      f: 1,
      dt: "",
      t: 1000,
    });
  };

  const deleteNode = (nodeIndex) => {
    const updatedDevices = devices.map((device, index) => {
      if (index === selectedDevice) {
        const updatedNodes = device.ns.filter((_, i) => i !== nodeIndex);
        return { ...device, ns: updatedNodes };
      }
      return device;
    });
    setDevices(updatedDevices);
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditingDevice({ ...devices[index] });
  };

  const saveEdit = (index) => {
    if (!editingDevice.n || !editingDevice.da || !editingDevice.pi) {
      alert("Please fill in all fields");
      return;
    }

    if (!isDeviceNameUnique(editingDevice.n, index)) {
      alert(
        "A device with this name already exists. Please use a unique name."
      );
      return;
    }

    const newDevices = [...devices];
    newDevices[index] = { ...editingDevice, ns: devices[index].ns || [] };
    setDevices(newDevices);
    setEditingIndex(null);
    setEditingDevice(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingDevice(null);
  };

  const startEditingNode = (nodeIndex) => {
    setEditingNodeIndex(nodeIndex);
    setEditingNode({ ...devices[selectedDevice].ns[nodeIndex] });
  };

  const handleEditNodeInputChange = (e) => {
    const { name, value } = e.target;

    // Add validation for name length
    if (name === "n" && value.length > MAX_NAME_LENGTH) {
      alert(`Node name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }

    // Add validation for timeout (10-65535 ms)
    if (name === "t") {
      const numValue = parseInt(value);
      if (
        value !== "" &&
        (isNaN(numValue) || numValue < MIN_TIMEOUT || numValue > MAX_TIMEOUT)
      ) {
        alert(`Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} ms`);
        return;
      }
    }

    setEditingNode((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveNodeEdit = (nodeIndex) => {
    if (
      !editingNode.n ||
      !editingNode.a ||
      !editingNode.f ||
      !editingNode.dt ||
      !editingNode.t
    ) {
      alert("Please fill in all node fields");
      return;
    }

    // Check if node name is unique across all devices (excluding current node)
    if (
      !isNodeNameUniqueAcrossDevices(editingNode.n, selectedDevice, nodeIndex)
    ) {
      alert(
        "A node with this name already exists in any device. Please use a unique name."
      );
      return;
    }

    const updatedDevices = devices.map((device, index) => {
      if (index === selectedDevice) {
        const updatedNodes = [...device.ns];
        updatedNodes[nodeIndex] = editingNode;
        return { ...device, ns: updatedNodes };
      }
      return device;
    });

    setDevices(updatedDevices);
    setEditingNodeIndex(null);
    setEditingNode(null);
  };

  const cancelNodeEdit = () => {
    setEditingNodeIndex(null);
    setEditingNode(null);
  };

  useEffect(() => {
    document.title = "SBIOT-Devices";
    fetchDeviceConfig();
  }, []);

  if (isLoading) {
    return html`
      <div class="p-6">
        <h1 class="text-2xl font-bold mb-6">Devices Management</h1>
        <div
          class="bg-white rounded-lg shadow-md p-6 flex items-center justify-center"
        >
          <div class="flex items-center space-x-2">
            <${Icons.SpinnerIcon} className="h-5 w-5 text-blue-600" />
            <span class="text-gray-600">Loading device configuration...</span>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Devices Management</h1>

      ${loadError &&
      html`
        <div
          class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between"
        >
          <div>${loadError}</div>
          <button
            onClick=${fetchDeviceConfig}
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
          Device configuration saved successfully! System will reboot to apply
          changes...
        </div>
      `}

      <!-- Tabs -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              onClick=${() => setActiveTab("device-config")}
              class=${`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm
                ${
                  activeTab === "device-config"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <!-- <${Icons.SettingsIcon} className="mr-2" /> -->
              Device Configuration
            </button>
            <button
              onClick=${() => setActiveTab("linkage-control")}
              class=${`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm
                ${
                  activeTab === "linkage-control"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <!-- <${Icons.LinkIcon} className="mr-2" /> -->
              Linkage Control
            </button>
          </nav>
        </div>
      </div>

      ${activeTab === "device-config"
        ? html`
            <!-- Device Configuration Tab Content -->
            <div>
              <div class="mb-8 bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-semibold mb-4">
                  Add New Device
                  <span class="text-sm text-gray-500 font-normal">
                    (${devices.length}/${MAX_DEVICES} devices)
                  </span>
                </h2>
                <form onSubmit=${handleSubmit}>
                  <div class="flex items-end gap-4">
                    <div class="flex-1">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Name
                        <span class="text-xs text-gray-500 ml-1"
                          >(max ${MAX_NAME_LENGTH} chars)</span
                        >
                      </label>
                      <input
                        type="text"
                        name="n"
                        value=${newDevice.n}
                        onChange=${handleInputChange}
                        maxlength=${MAX_NAME_LENGTH}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter unique device name"
                        required
                      />
                    </div>
                    <div class="flex-1">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                        >Slave Address
                        <span class="text-xs text-gray-500 ml-1">(1-247)</span>
                      </label>
                      <input
                        type="number"
                        name="da"
                        value=${newDevice.da}
                        onChange=${handleInputChange}
                        min="1"
                        max="247"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter slave address"
                        required
                      />
                    </div>
                    <div class="flex-1">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Polling Interval
                        <span class="text-xs text-gray-500 ml-1"
                          >(${MIN_POLLING_INTERVAL}-${MAX_POLLING_INTERVAL}
                          ms)</span
                        >
                      </label>
                      <input
                        type="number"
                        name="pi"
                        value=${newDevice.pi}
                        onChange=${handleInputChange}
                        min=${MIN_POLLING_INTERVAL}
                        max=${MAX_POLLING_INTERVAL}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter polling interval"
                        required
                      />
                    </div>
                    <div class="flex-1">
                      <label
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Merge Collection
                      </label>
                      <div
                        class="w-full px-3 py-2 border border-gray-300 rounded-md flex items-center min-h-[42px]"
                      >
                        <label class="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id="g"
                            name="g"
                            checked=${newDevice.g}
                            onChange=${(e) =>
                              setNewDevice({
                                ...newDevice,
                                g: e.target.checked,
                              })}
                            class="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span class="ml-2 text-gray-700">Yes</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-end mt-4">
                    <${Button}
                      onClick=${handleSubmit}
                      variant="primary"
                      icon="SaveIcon"
                    >
                      Add Device
                    <//>
                  </div>
                </form>
              </div>

              <!-- Devices Table -->
              <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                <table class="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead class="bg-gray-50">
                    <tr>
                      <${Th}>No.<//>
                      <${Th}>Name<//>
                      <${Th}>Slave Address<//>
                      <${Th}>Polling Interval<//>
                      <${Th}>Merge Collection<//>
                      <${Th}>Actions<//>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${devices.map(
                      (device, index) => html`
                        <tr
                          key=${index}
                          class=${selectedDevice === index ? "bg-blue-50" : ""}
                          onClick=${() => setSelectedDevice(index)}
                          style="cursor: pointer;"
                        >
                          <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            ${index + 1}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            ${editingIndex === index
                              ? html`
                                  <input
                                    type="text"
                                    name="n"
                                    value=${editingDevice.n}
                                    onChange=${handleEditInputChange}
                                    maxlength=${MAX_NAME_LENGTH}
                                    class="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                `
                              : device.n}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            ${editingIndex === index
                              ? html`
                                  <input
                                    type="number"
                                    name="da"
                                    value=${editingDevice.da}
                                    onChange=${handleEditInputChange}
                                    min="1"
                                    max="247"
                                    class="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                `
                              : device.da}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            ${editingIndex === index
                              ? html`
                                  <input
                                    type="number"
                                    name="pi"
                                    value=${editingDevice.pi}
                                    onChange=${handleEditInputChange}
                                    min=${MIN_POLLING_INTERVAL}
                                    max=${MAX_POLLING_INTERVAL}
                                    class="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                `
                              : `${device.pi} ms`}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            ${editingIndex === index
                              ? html`
                                  <input
                                    type="checkbox"
                                    name="g"
                                    checked=${editingDevice.g}
                                    onChange=${(e) =>
                                      setEditingDevice({
                                        ...editingDevice,
                                        g: e.target.checked,
                                      })}
                                    class="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                `
                              : html`
                                  <input
                                    type="checkbox"
                                    checked=${device.g}
                                    disabled
                                    class="h-4 w-4 text-blue-600 rounded border-gray-300"
                                  />
                                `}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap space-x-2">
                            ${editingIndex === index
                              ? html`
                                  <button
                                    onClick=${(e) => {
                                      e.stopPropagation();
                                      saveEdit(index);
                                    }}
                                    class="text-green-600 hover:text-green-900"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick=${(e) => {
                                      e.stopPropagation();
                                      cancelEdit();
                                    }}
                                    class="text-gray-600 hover:text-gray-900"
                                  >
                                    Cancel
                                  </button>
                                `
                              : html`
                                  <button
                                    onClick=${(e) => {
                                      e.stopPropagation();
                                      startEditing(index);
                                    }}
                                    class="text-blue-600 hover:text-blue-900 mr-2"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick=${(e) => {
                                      e.stopPropagation();
                                      const newDevices = devices.filter(
                                        (_, i) => i !== index
                                      );
                                      setDevices(newDevices);
                                      if (selectedDevice === index)
                                        setSelectedDevice(null);
                                    }}
                                    class="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                `}
                          </td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              </div>

              ${selectedDevice !== null &&
              html`
                <div class="mt-8">
                  <h2 class="text-2xl font-bold mb-4">
                    Node Details for ${devices[selectedDevice].n}
                    <span class="text-sm text-gray-500 font-normal">
                      (Device Nodes:
                      ${devices[selectedDevice].ns
                        ? devices[selectedDevice].ns.length
                        : 0},
                      Total Nodes: ${getTotalNodes()}/${MAX_TOTAL_NODES})
                    </span>
                  </h2>

                  <!-- Add Node Form -->
                  <form
                    onSubmit=${handleNodeSubmit}
                    class="mb-8 bg-white p-6 rounded-lg shadow-md"
                  >
                    <h3 class="text-lg font-semibold mb-4">
                      Add New Node
                      ${getTotalNodes() >= MAX_TOTAL_NODES
                        ? html`<span
                            class="text-red-500 text-sm font-normal ml-2"
                          >
                            (Maximum nodes limit reached)
                          </span>`
                        : html`<span
                            class="text-gray-500 text-sm font-normal ml-2"
                          >
                            (${MAX_TOTAL_NODES - getTotalNodes()} nodes
                            remaining)
                          </span>`}
                    </h3>
                    <div class="grid grid-cols-5 gap-4">
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Name
                          <span class="text-xs text-gray-500 ml-1"
                            >(max ${MAX_NAME_LENGTH} chars)</span
                          >
                        </label>
                        <input
                          type="text"
                          name="n"
                          value=${newNode.n}
                          onChange=${handleNodeInputChange}
                          maxlength=${MAX_NAME_LENGTH}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Node name"
                          required
                        />
                      </div>
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Register Address</label
                        >
                        <input
                          type="text"
                          name="a"
                          value=${newNode.a}
                          onChange=${handleNodeInputChange}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Register address"
                        />
                      </div>
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                          >Function code</label
                        >
                        <select
                          name="f"
                          value=${newNode.f}
                          onChange=${handleNodeInputChange}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          ${functionMap.map(
                            ([value, label]) => html`
                              <option value=${value}>${label}</option>
                            `
                          )}
                        </select>
                      </div>
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Data type
                        </label>
                        <select
                          name="dt"
                          value=${newNode.dt}
                          onChange=${handleNodeInputChange}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select type</option>
                          ${dataTypeMap.map(
                            ([value, label]) => html`
                              <option value=${value}>${label}</option>
                            `
                          )}
                        </select>
                      </div>
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Timeout
                          <span class="text-xs text-gray-500 ml-1"
                            >(${MIN_TIMEOUT}-${MAX_TIMEOUT} ms)</span
                          >
                        </label>
                        <input
                          type="number"
                          name="t"
                          value=${newNode.t}
                          onChange=${handleNodeInputChange}
                          min=${MIN_TIMEOUT}
                          max=${MAX_TIMEOUT}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Timeout"
                        />
                      </div>
                    </div>
                    <div class="flex justify-end mt-4">
                      <${Button}
                        onClick=${handleNodeSubmit}
                        variant="primary"
                        icon="SaveIcon"
                      >
                        Add Node
                      <//>
                    </div>
                  </form>

                  <!-- Nodes Table -->
                  <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <table
                      class="min-w-full divide-y divide-gray-200 table-fixed"
                    >
                      <thead class="bg-gray-50">
                        <tr>
                          <${Th}>No.<//>
                          <${Th}>Name<//>
                          <${Th}>Register Address<//>
                          <${Th}>Function code<//>
                          <${Th}>Data type<//>
                          <${Th}>Timeout<//>
                          <${Th}>Actions<//>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        ${(devices[selectedDevice].ns || []).map(
                          (node, nodeIndex) => html`
                            <tr key=${nodeIndex}>
                              <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                              >
                                ${nodeIndex + 1}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <input
                                        type="text"
                                        name="n"
                                        value=${editingNode.n}
                                        onChange=${handleEditNodeInputChange}
                                        maxlength=${MAX_NAME_LENGTH}
                                        class="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    `
                                  : node.n}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <input
                                        type="text"
                                        name="a"
                                        value=${editingNode.a}
                                        onChange=${handleEditNodeInputChange}
                                        class="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    `
                                  : node.a}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <select
                                        name="f"
                                        value=${editingNode.f}
                                        onChange=${handleEditNodeInputChange}
                                        class="w-full px-2 py-1 border border-gray-300 rounded"
                                      >
                                        ${functionMap.map(
                                          ([value, label]) => html`
                                            <option value=${value}>
                                              ${label}
                                            </option>
                                          `
                                        )}
                                      </select>
                                    `
                                  : functionMap.find(
                                      ([value]) => value === node.f
                                    )?.[1]}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <select
                                        name="dt"
                                        value=${editingNode.dt}
                                        onChange=${handleEditNodeInputChange}
                                        class="w-full px-2 py-1 border border-gray-300 rounded"
                                      >
                                        ${dataTypeMap.map(
                                          ([value, label]) => html`
                                            <option value=${value}>
                                              ${label}
                                            </option>
                                          `
                                        )}
                                      </select>
                                    `
                                  : dataTypeMap.find(
                                      ([value]) => value === parseInt(node.dt)
                                    )?.[1]}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <input
                                        type="number"
                                        name="t"
                                        value=${editingNode.t}
                                        onChange=${handleEditNodeInputChange}
                                        min=${MIN_TIMEOUT}
                                        max=${MAX_TIMEOUT}
                                        class="w-full px-2 py-1 border border-gray-300 rounded"
                                      />
                                    `
                                  : `${node.t} ms`}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap">
                                ${editingNodeIndex === nodeIndex
                                  ? html`
                                      <button
                                        onClick=${() => saveNodeEdit(nodeIndex)}
                                        class="text-green-600 hover:text-green-900 mr-2"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick=${cancelNodeEdit}
                                        class="text-gray-600 hover:text-gray-900 mr-2"
                                      >
                                        Cancel
                                      </button>
                                    `
                                  : html`
                                      <button
                                        onClick=${() =>
                                          startEditingNode(nodeIndex)}
                                        class="text-blue-600 hover:text-blue-900 mr-2"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick=${() => deleteNode(nodeIndex)}
                                        class="text-red-600 hover:text-red-900"
                                      >
                                        Delete
                                      </button>
                                    `}
                              </td>
                            </tr>
                          `
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              `}
            </div>
          `
        : html`
            <!-- Linkage Control Tab Content -->
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-xl font-semibold mb-6">
                Device Linkage Settings
              </h2>

              <div class="space-y-6">
                <!-- Linkage Rules Section -->
                <div>
                  <h3 class="text-lg font-medium mb-4">Linkage Rules</h3>
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                      <span class="text-sm font-medium text-gray-700"
                        >Active Rules</span
                      >
                      <button
                        class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        onClick=${() => {
                          // Add new rule logic here
                        }}
                      >
                        Add Rule
                      </button>
                    </div>

                    <div class="border rounded-lg bg-white">
                      <div class="px-4 py-3 border-b">
                        <div
                          class="grid grid-cols-6 gap-4 text-sm font-medium text-gray-500"
                        >
                          <div>Source Device</div>
                          <div>Source Node</div>
                          <div>Condition</div>
                          <div>Target Device</div>
                          <div>Target Node</div>
                          <div>Action</div>
                        </div>
                      </div>

                      <div class="p-4 text-sm text-gray-500">
                        No linkage rules configured yet.
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Device Dependencies Section -->
                <div>
                  <h3 class="text-lg font-medium mb-4">Device Dependencies</h3>
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-2">
                          Source Devices
                        </h4>
                        <select
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select source device</option>
                          ${devices.map(
                            (device) => html`
                              <option value=${device.n}>${device.n}</option>
                            `
                          )}
                        </select>
                      </div>
                      <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-2">
                          Target Devices
                        </h4>
                        <select
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select target device</option>
                          ${devices.map(
                            (device) => html`
                              <option value=${device.n}>${device.n}</option>
                            `
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `}

      <!-- Save and Cancel Buttons -->
      <div
        class="mt-8 border-t border-gray-200 pt-6 pb-4 flex justify-end gap-4"
      >
        <${Button}
          onClick=${() => {
            if (confirm("Are you sure you want to discard all changes?")) {
              fetchDeviceConfig();
            }
          }}
          variant="secondary"
          icon="CloseIcon"
          disabled=${isSaving}
        >
          Cancel
        <//>
        <${Button}
          onClick=${saveDeviceConfig}
          disabled=${isSaving}
          loading=${isSaving}
          icon="SaveIcon"
        >
          Save Configuration
        <//>
      </div>
    </div>
  `;
}

export default Devices;
