
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
const BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMyProfile() {
      setLoading(true);
      setError("");

      try {
        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          throw new Error("Please log in to view your profile.");
        }

        const user = JSON.parse(savedUser);
        const userId = user.user_id ?? user.id ?? user.userId;

        if (!userId) {
          throw new Error(
            "Student ID was not found. Please log in again."
          );
        }

        const response = await fetch(
          `${BACKEND_URL}/student/profile/${encodeURIComponent(
            userId
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load your profile."
          );
        }

        // Supports either a direct profile object or a wrapped response.
        const student = data.student ?? data.profile ?? data;

        setProfile(student);
      } catch (err) {
        setError(err.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    fetchMyProfile();
  }, []);

  const fullName = profile
    ? [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  function formatDate(value) {
    if (!value) return "Not provided";

    // Display a database date without shifting it to another timezone.
    const datePart = String(value).slice(0, 10);
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return value;

    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  function displayValue(value) {
    return value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
      ? value
      : "Not provided";
  }

  const details = [
    {
      label: "First Name",
      value: profile?.first_name,
      icon: "♙",
    },
    {
      label: "Last Name",
      value: profile?.last_name,
      icon: "♙",
    },
    {
      label: "Email Address",
      value: profile?.email,
      icon: "✉",
    },
    {
      label: "Contact Number",
      value: profile?.contact,
      icon: "☎",
    },
    {
      label: "Course",
      value: profile?.course,
      icon: "▤",
    },
    {
      label: "Enrollment Date",
      value: profile?.enrollment_date
        ? formatDate(profile.enrollment_date)
        : "",
      icon: "▦",
    },
    {
      label: "Course Duration",
      value: profile?.duration,
      icon: "◷",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/student"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
        >
          <span aria-hidden="true">←</span>
          Back to Student Dashboard
        </Link>

        {/* Page heading */}
        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Student Account
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            My Profile
          </h1>

          <p className="mt-2 text-slate-500">
            View your latest personal and academic information.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="font-medium text-slate-600">
              Loading your profile...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
          >
            <p className="font-semibold">Unable to display your profile</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : profile ? (
          <>
            {/* Profile banner */}
            <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="h-2 bg-blue-600" />

              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-3xl font-bold uppercase text-blue-700">
                  {fullName
                    ? fullName.charAt(0)
                    : "S"}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-2xl font-bold text-slate-800">
                    {fullName || "Student"}
                  </h2>

                  <p className="mt-1 break-all text-slate-500">
                    {displayValue(profile.email)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Student
                    </span>

                    {profile.course && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {profile.course}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to="/student-profile"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                >
                  Update Profile
                </Link>
              </div>
            </div>

            {/* Profile details */}
            <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 border-b border-slate-200 pb-5">
                <h3 className="text-lg font-bold text-slate-800">
                  Personal & Academic Details
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Information saved in your student profile.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {details.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-lg text-blue-700">
                        {item.icon}
                      </span>

                      <p className="text-sm font-medium text-slate-500">
                        {item.label}
                      </p>
                    </div>

                    <p className="break-words font-semibold text-slate-800">
                      {displayValue(item.value)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Tip:</span>{" "}
                  To change your information, open Student Profile Update,
                  save your changes, and return to My Profile.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-700">
              No profile information was returned.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
