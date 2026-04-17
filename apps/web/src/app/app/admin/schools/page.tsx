"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/client-logger";
import { CLIPBOARD_TIMING } from "@/lib/constants/ui-timings";
import {
  rotateStaffPin,
  searchSchools,
  checkAdminAuth,
} from "@/app/actions/school";
import {
  getDistricts,
  getBlocksByDistrict,
  getSchoolsByDistrictAndBlock,
  getSchoolPinStatus,
  type District,
  type Block,
  type SchoolData,
} from "@/app/actions/school-finder";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Shield,
  RefreshCw,
  Search,
  Copy,
  Check,
  MapPin,
} from "lucide-react";

// School Finder Modal Component
function SchoolFinderModal({
  isOpen,
  onClose,
  onSelectSchool,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onSelectSchool: (school: SchoolData) => Promise<void>;
}>) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load districts on mount
  useEffect(() => {
    if (isOpen) {
      loadDistricts();
    }
  }, [isOpen]);

  // Load blocks when district changes
  useEffect(() => {
    if (selectedDistrict) {
      // Clear dependent state BEFORE async load (prevent race condition)
      setSelectedBlock("");
      setSchools([]);
      // loadBlocks() will set blocks asynchronously when fetch completes
      loadBlocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  // Load schools when district OR block changes
  useEffect(() => {
    if (selectedDistrict) {
      loadSchools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict, selectedBlock]);

  async function loadDistricts() {
    setLoading(true);
    try {
      const result = await getDistricts();
      if (result.success) {
        setDistricts(result.data);
      } else {
        toast.error(result.error || "Failed to load districts");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load districts",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function loadBlocks() {
    if (!selectedDistrict) return;

    // Clear blocks state BEFORE fetch to show loading state cleanly (prevent flicker)
    setBlocks([]);
    setLoading(true);
    try {
      const result = await getBlocksByDistrict(selectedDistrict);
      if (result.success) {
        setBlocks(result.data);
      } else {
        toast.error(result.error || "Failed to load blocks");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load blocks",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function loadSchools() {
    if (!selectedDistrict) return;

    setLoading(true);
    try {
      const result = await getSchoolsByDistrictAndBlock(
        selectedDistrict,
        selectedBlock || undefined,
      );
      if (result.success) {
        setSchools(result.data);
      } else {
        toast.error(result.error || "Failed to load schools");
      }
    } catch (error) {
      clientLogger.error(
        "[SchoolFinderModal] Failed to load schools",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find School by Location
        </h2>

        {/* District Selection */}
        <div className="mb-4">
          <label htmlFor="district-select" className="text-sm font-semibold mb-2 block">District</label>
          <select
            id="district-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm"
            disabled={loading}
          >
            <option value="">-- Select District --</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Block Selection */}
        {selectedDistrict && (
          <div className="mb-4">
            <label htmlFor="block-select" className="text-sm font-semibold mb-2 block">Block</label>
            <select
              id="block-select"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              disabled={loading}
            >
              <option value="">-- All Blocks --</option>
              {blocks.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name || "Not Specified"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Schools List */}
        {schools.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y max-h-64 overflow-y-auto">
            {schools.map((school) => (
              <button
                type="button"
                key={school.id}
                onClick={async () => {
                  try {
                    await onSelectSchool(school);
                  } finally {
                    onClose();
                  }
                }}
                className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                <div className="font-semibold text-sm text-slate-800">
                  {school.school_name}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  <strong>Code:</strong> {school.school_code} •{" "}
                  <strong>Block:</strong> {school.block || "N/A"}
                </div>
                {school.address && (
                  <div className="text-xs text-slate-400 mt-1">
                    {school.address}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedDistrict && schools.length === 0 && !loading && (
          <div className="text-center py-4 text-slate-400 text-sm">
            No schools found in{" "}
            {selectedBlock ? `${selectedBlock} block` : "this district"}
          </div>
        )}

        {/* Close Button */}
        <button
                type="button"
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-2xl font-black text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Copy to Clipboard Component
function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);

  // ERR-006 FIX: Add error handling for clipboard API
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), CLIPBOARD_TIMING.successFeedback);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <button
                type="button"
      onClick={handleCopy}
      className={`p-2 rounded transition-all ${
        copied
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-50 hover:bg-slate-100 text-slate-500"
      }`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// PIN Status Display Component
function PinStatusDisplay({
  pinStatus,
  schoolCode,
  loading,
  onCheckStatus,
}: Readonly<{
  pinStatus: {
    exists: boolean;
    createdAt?: string;
    lastRotatedAt?: string;
  } | null;
  schoolCode: string;
  loading: boolean;
  onCheckStatus: (code: string) => void;
}>) {
  if (!pinStatus) {
    return (
      <button
                type="button"
        onClick={() => onCheckStatus(schoolCode)}
        disabled={loading}
        className="px-4 py-2 rounded-2xl font-black text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check PIN Status"}
      </button>
    );
  }

  if (pinStatus.exists) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <p className="text-xs text-blue-800 font-semibold">✓ PIN Exists</p>
        <p className="text-sm text-blue-800 mt-2">
          <strong>Created:</strong>{" "}
          {pinStatus.createdAt
            ? new Date(pinStatus.createdAt).toLocaleDateString()
            : "N/A"}
        </p>
        {pinStatus.lastRotatedAt && (
          <p className="text-sm text-blue-800">
            <strong>Last Rotated:</strong>{" "}
            {new Date(pinStatus.lastRotatedAt).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs text-blue-600 mt-3 font-semibold">
          👇 Scroll down to Step 3 to rotate the PIN
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
      <p className="text-xs text-amber-800 font-semibold">⚠ No PIN Found</p>
      <p className="text-sm text-amber-800 mt-2">
        This school doesn&apos;t have a PIN yet. Create one in Step 3.
      </p>
      <p className="text-xs text-amber-600 mt-3 font-semibold">
        👇 Scroll down to Step 3 to create the PIN
      </p>
    </div>
  );
}

// Main Admin Panel
export default function AdminSchoolsPage() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SchoolData[]>([]);
  const [finderModalOpen, setFinderModalOpen] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check admin authorization on mount
  useEffect(() => {
    async function verifyAuth() {
      try {
        const result = await checkAdminAuth();
        if (result.authorized) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          setAuthError(result.error || "Unauthorized");
        }
      } catch (error) {
        clientLogger.error(
          "[AdminSchoolsPage] Failed to verify authorization",
          error instanceof Error ? error : new Error(String(error))
        );
        setAuthorized(false);
        setAuthError("Failed to verify authorization");
      }
    }

    verifyAuth();
  }, []);

  // Selected school data
  const [selectedSchool, setSelectedSchool] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);

  // PIN Rotation form
  const [schoolCode, setSchoolCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // PIN status
  const [pinStatus, setPinStatus] = useState<{
    exists: boolean;
    createdAt?: string;
    lastRotatedAt?: string;
  } | null>(null);

  // Search schools by code or name
  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error("Please enter a school code or name");
      return;
    }

    setLoading(true);
    try {
      const result = await searchSchools(searchQuery);
      if (result?.success && result?.data) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          toast.info("No schools found matching your search");
        }
      } else {
        toast.error(result?.error || "Failed to search schools");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to search schools",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred while searching");
    } finally {
      setLoading(false);
    }
  }

  // Handle school selection from search or finder
  async function handleSelectSchool(school: SchoolData) {
    setSelectedSchool({
      id: school.id,
      code: school.school_code,
      name: school.school_name,
    });
    setSchoolCode(school.school_code);
    setSearchResults([]);
    setSearchQuery("");

    // Auto-fetch PIN status
    await handleGetPinStatus(school.school_code);
  }

  // Get PIN status
  async function handleGetPinStatus(code: string) {
    const codeToCheck = code || schoolCode;
    if (!codeToCheck.trim()) {
      toast.error("Please enter a school code");
      return;
    }

    setLoading(true);
    try {
      const result = await getSchoolPinStatus(codeToCheck.toUpperCase().trim());
      if (result.success) {
        setPinStatus({
          exists: result.exists,
          createdAt: result.createdAt,
          lastRotatedAt: result.lastRotatedAt,
        });
      } else {
        toast.error(result.error || "Failed to fetch PIN status");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to fetch PIN status",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Rotate or create PIN
  async function handleRotatePin(e: React.SyntheticEvent) {
    e.preventDefault();

    if (!schoolCode.trim()) {
      toast.error("Please enter a school code");
      return;
    }

    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 characters long");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await rotateStaffPin(
        schoolCode.toUpperCase().trim(),
        newPin,
      );

      if (result.success) {
        const action = pinStatus?.exists ? "rotated" : "created";
        toast.success(`PIN ${action} successfully for ${result.schoolName}`);
        setNewPin("");
        setConfirmPin("");

        // Refresh PIN status
        await handleGetPinStatus(schoolCode);
      } else {
        toast.error(result.error || "Failed to rotate PIN");
      }
    } catch (error) {
      clientLogger.error(
        "[AdminSchoolsPage] Failed to rotate PIN",
        error instanceof Error ? error : new Error(String(error))
      );
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state
  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Show authorization error and redirect to admin login
  if (!authorized || authError) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-500 mb-6">
            {authError ||
              "You do not have permission to access this page. Admin access required."}
          </p>
          <div className="space-y-3">
            <Link
              href="/admin/login"
              className="block w-full py-3 rounded-2xl font-black text-sm text-white text-center"
              style={{ background: "var(--gradient-admin)" }}
            >
              Admin Login
            </Link>
            <Link
              href="/"
              className="block w-full py-3 rounded-2xl font-black text-sm text-slate-700 text-center bg-white border border-slate-200"
            >
              Go Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pinActionLabel = pinStatus?.exists ? "Rotate" : "Create";

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        {/* Red Gradient Banner */}
        <div className="rounded-[32px] p-6 text-white mb-8" style={{ background: "var(--gradient-admin)" }}>
          <h1 className="text-xl sm:text-2xl font-black mb-1">School Management</h1>
          <p className="text-red-100 text-xs font-black uppercase tracking-widest mb-6">Assam Digital Initiative • Admin Portal</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 p-3 rounded-2xl text-center backdrop-blur-md">
              <p className="text-xl font-black">124</p>
              <p className="text-[11px] uppercase font-black text-red-100">Schools</p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl text-center backdrop-blur-md">
              <Shield className="h-5 w-5 mx-auto mb-1" />
              <p className="text-[11px] uppercase font-black text-red-100">PIN Mgmt</p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl text-center backdrop-blur-md">
              <p className="text-xl font-black">🔐</p>
              <p className="text-[11px] uppercase font-black text-red-100">Secure</p>
            </div>
          </div>
        </div>

        {/* School Finder Modal */}
        <SchoolFinderModal
          isOpen={finderModalOpen}
          onClose={() => setFinderModalOpen(false)}
          onSelectSchool={handleSelectSchool}
        />

        {/* Step 1: Find School */}
        <div className="mb-6 p-6 bg-white border border-slate-100 rounded-3xl">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Step 1: Find School
          </h2>

          <div className="space-y-4">
            {/* Quick Search */}
            <div>
              <label htmlFor="school-search" className="text-sm font-medium mb-2 block">
                Quick Search by Code or Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="school-search"
                  placeholder="e.g., 14H0182 or School Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  disabled={loading}
                  className="flex-1"
                />
                <button
                type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-2 rounded-2xl font-black text-sm text-white flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 flex-shrink-0"
                  style={{ background: "var(--gradient-admin)" }}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((school) => (
                  <button
                type="button"
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-800">
                        {school.school_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {school.school_code} • {school.district}
                      </div>
                    </div>
                    <Copy className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Hierarchical Finder Button */}
            <button
                type="button"
              onClick={() => setFinderModalOpen(true)}
              className="w-full px-4 py-2 rounded-2xl font-black text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Or Browse by District &amp; Block
            </button>
          </div>

          {/* Selected School Display */}
          {selectedSchool && (
            <div className="mt-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    ✓ Selected School
                  </p>
                  <p className="text-sm text-emerald-700 font-semibold mt-1">
                    {selectedSchool.name}
                  </p>
                  <p className="text-xs text-emerald-700 font-mono mt-1">
                    Code: {selectedSchool.code}
                  </p>
                </div>
                <CopyButton text={selectedSchool.code} />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Check/Create PIN */}
        {selectedSchool && (
          <div className="mb-6 p-6 bg-white border border-slate-100 rounded-3xl">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Step 2: PIN Status
            </h2>

            <div className="space-y-4">
              <PinStatusDisplay
                pinStatus={pinStatus}
                schoolCode={schoolCode}
                loading={loading}
                onCheckStatus={handleGetPinStatus}
              />
            </div>
          </div>
        )}

        {/* Step 3: Rotate/Create PIN */}
        {selectedSchool && (
          <div className="p-6 bg-white border border-slate-100 rounded-3xl">
            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Step 3: {pinActionLabel} PIN
            </h2>

            <form onSubmit={handleRotatePin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-code-rotate" className="text-sm">
                  School Code
                </Label>
                <Input
                  id="school-code-rotate"
                  type="text"
                  value={schoolCode}
                  disabled
                  className="bg-slate-50 uppercase font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pin" className="text-sm">
                  {pinStatus?.exists ? "New" : ""} Staff PIN
                </Label>
                <Input
                  id="new-pin"
                  type="password"
                  placeholder="e.g., 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  disabled={loading}
                  minLength={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Min 4 characters (numeric recommended)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin" className="text-sm">
                  Confirm PIN
                </Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  placeholder="Re-enter PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                  disabled={loading}
                  minLength={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded text-xs text-amber-800">
                <p>
                  <strong>⚠️ Security Notice</strong>
                </p>
                <p className="mt-1">
                  PIN will be bcrypt hashed.{" "}
                  {pinStatus?.exists
                    ? "Old PIN becomes invalid immediately."
                    : "Teachers can use this PIN for registration."}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || newPin !== confirmPin || newPin.length < 4}
                className="w-full px-4 py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                style={{ background: "var(--gradient-admin)" }}
              >
                <RefreshCw className="h-4 w-4" />
                {loading ? "Processing..." : `${pinActionLabel} PIN`}
              </button>
            </form>

            {/* Help */}
            <div className="mt-6 bg-blue-50 border border-slate-100 p-4 rounded-2xl">
              <h3 className="font-black text-slate-800 text-sm mb-2">
                📋 Quick Guide
              </h3>
              <ul className="text-sm text-slate-500 space-y-2">
                <li>
                  <strong>Step 1:</strong> Search schools or browse by
                  district/block
                </li>
                <li>
                  <strong>Step 2:</strong> Click school → Code auto-fills →
                  Check PIN status
                </li>
                <li>
                  <strong>Step 3:</strong>{" "}
                  {pinStatus?.exists ? "Rotate" : "Create"} PIN for teachers
                </li>
                <li>
                  <strong>Result:</strong> Teachers use code + PIN for
                  registration
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
