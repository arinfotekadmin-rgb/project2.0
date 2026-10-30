
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function StudentDetails() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchStudents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/students`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load student details."
        );
      }

      setStudents(
        Array.isArray(data) ? data : data.students || []
      );
    } catch (err) {
      setError(
        err.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">

        {/* Back navigation */}
        <Link
          to="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to Admin Dashboard
        </Link>

        {/* Page heading */}
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Student Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            Student Details
          </h1>

          <p className="mt-2 text-slate-500">
            View student records stored in AttendEase.
          </p>
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="h-2 bg-blue-600" />

          <div className="p-6 sm:p-8">

            {/* Card heading */}
            <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-700">
                  ♙
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Student Directory
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {loading
                      ? "Loading student records..."
                      : `${students.length} student record${
                          students.length === 1 ? "" : "s"
                        } found`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchStudents}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p>{error}</p>

                <button
                  type="button"
                  onClick={fetchStudents}
                  className="mt-2 font-semibold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">
                <p className="font-medium text-slate-600">
                  Loading student details...
                </p>
              </div>
            ) : !error && students.length === 0 ? (
              /* Empty state */
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="mb-3 text-3xl text-blue-600">
                  ♙
                </div>

                <h3 className="font-semibold text-slate-700">
                  No Student Records Found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Existing student records will appear here.
                </p>
              </div>
            ) : !error ? (
              /* Student table */
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="whitespace-nowrap px-5 py-4">
                          Student ID
                        </th>

                        <th className="whitespace-nowrap px-5 py-4">
                          Student Name
                        </th>

                        <th className="whitespace-nowrap px-5 py-4">
                          Email Address
                        </th>

                        <th className="whitespace-nowrap px-5 py-4">
                          Course
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {students.map((student, index) => (
                        <tr
                          key={
                            student.student_id ??
                            student.user_id ??
                            index
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                            {student.student_id ?? "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">
                                {(
                                  student.first_name ||
                                  student.name ||
                                  "S"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {[
                                    student.first_name,
                                    student.last_name,
                                  ]
                                    .filter(Boolean)
                                    .join(" ") ||
                                    student.name ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  User ID: {student.user_id ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {student.email || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                              {student.course || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Footer note */}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-sm text-slate-500">
                Student records are retrieved from your existing database.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          AttendEase · Student Management
        </p>
      </div>
    </div>
  );
}
