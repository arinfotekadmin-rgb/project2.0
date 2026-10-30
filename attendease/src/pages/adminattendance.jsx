
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function AdminAttendance() {
  const today = new Date().toLocaleDateString("en-CA");

  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [editedStatuses, setEditedStatuses] = useState({});

  // Load attendance records for the selected date
  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      setError("");
      setSaveMessage("");

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/attendance/admin?date=${selectedDate}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load attendance records."
          );
        }

        setRecords(data.records || []);
        setEditedStatuses({});
      } catch (err) {
        setError(err.message || "Unable to connect to the backend.");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    if (selectedDate) {
      fetchAttendance();
    }
  }, [selectedDate]);

  // Save a student's attendance status
  async function saveAttendance(studentId, status) {
    setSavingId(studentId);
    setSaveMessage("");
    setError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/attendance/admin/${studentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save attendance.");
      }

      // Refresh records after saving
      const refreshResponse = await fetch(
        `${BACKEND_URL}/api/attendance/admin?date=${selectedDate}`
      );

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        throw new Error(
          refreshData.message ||
            "Attendance saved, but refreshing records failed."
        );
      }

      setRecords(refreshData.records || []);
      setEditedStatuses({});
      setSaveMessage(
        `Attendance saved successfully for ${data.record.attendance_date}.`
      );
    } catch (err) {
      setError(err.message || "Unable to save attendance.");
    } finally {
      setSavingId(null);
    }
  }

  // Search students
  const filteredRecords = records.filter((record) => {
    const query = search.toLowerCase();

    return (
      (record.name || "").toLowerCase().includes(query) ||
      (record.email || "").toLowerCase().includes(query) ||
      String(record.user_id).includes(query)
    );
  });

  // Attendance summary
  const presentCount = records.filter(
    (record) => record.status === "present"
  ).length;

  const absentCount = records.filter(
    (record) => record.status === "absent"
  ).length;

  const lateCount = records.filter(
    (record) => record.status === "late"
  ).length;

  const notMarkedCount = records.filter(
    (record) => !record.status
  ).length;

  // Display check-in time only when it represents an actual check-in
  function formatCheckInTime(value, status) {
    if (!value || status === "absent") {
      return "—";
    }

    const date = new Date(value);

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function statusStyle(status) {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "late":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/admin"
          className="mb-5 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Attendance Management
          </h1>

          <p className="mt-2 text-slate-500">
            View and manage student attendance by date.
          </p>
        </div>

        {/* Date selection and search */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <label
            htmlFor="attendance-date"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Select attendance date
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student name, email, or ID..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 sm:max-w-md"
            />
          </div>
        </div>

        {/* Attendance summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Present",
              count: presentCount,
              color: "text-green-600",
            },
            {
              label: "Absent",
              count: absentCount,
              color: "text-red-600",
            },
            {
              label: "Late",
              count: lateCount,
              color: "text-amber-600",
            },
            {
              label: "Not Marked",
              count: notMarkedCount,
              color: "text-slate-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.count}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback messages */}
        {saveMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {saveMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Attendance table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Student Attendance
            </h2>

            <p className="text-sm text-slate-500">
              {filteredRecords.length} student(s)
            </p>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-500">
              Loading attendance records...
            </p>
          ) : filteredRecords.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No student records found for this date.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Student ID</th>
                    <th className="px-5 py-4 font-semibold">Student</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Check-in Time</th>
                    <th className="px-5 py-4 font-semibold">Current Status</th>
                    <th className="px-5 py-4 font-semibold">Edit Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => {
                    const selectedStatus =
                      editedStatuses[record.user_id] ??
                      record.status ??
                      "present";

                    return (
                      <tr
                        key={record.user_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-700">
                          {record.user_id}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-800">
                          {record.name}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {record.email}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatCheckInTime(
                            record.check_in_time,
                            record.status
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(
                              record.status
                            )}`}
                          >
                            {record.status || "Not marked"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`Edit attendance status for ${record.name}`}
                            value={selectedStatus}
                            onChange={(event) =>
                              setEditedStatuses((previous) => ({
                                ...previous,
                                [record.user_id]: event.target.value,
                              }))
                            }
                            disabled={savingId === record.user_id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              saveAttendance(record.user_id, selectedStatus)
                            }
                            disabled={savingId !== null}
                            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingId === record.user_id
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Admin changes can create attendance records for dates without an
          existing record. Future-dated entries represent admin-entered
          attendance, not verified student check-ins. Location history is
          unavailable because the current database does not store coordinates.
        </p>
      </div>
    </div>
  );
}
