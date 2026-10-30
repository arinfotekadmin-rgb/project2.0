
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BACKEND_URL = import.meta.env.VITE_BACKEND;


const COLLEGE_LOCATION = {
  latitude: 12.754383872187988,
  longitude: 77.82868321013642,
  allowedRadius: 150,
};

const API_BASE = `{BACKEND_URL}`;

function getDistanceInMetres(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function StudentAttendance() {
  const [holiday, setHoliday] = useState(null);
const [holidayChecked, setHolidayChecked] = useState(false);
const [holidayError, setHolidayError] = useState(false);

useEffect(() => {
  let cancelled = false;

  async function checkPublicHoliday() {
    try {
      const response = await fetch(
        `${API_BASE}/api/public-holiday/today`
      );

      if (!response.ok) {
        throw new Error("Holiday check failed");
      }

      const data = await response.json();

      if (!cancelled) {
        setHoliday(data.isHoliday ? data.holiday : null);
        setHolidayError(false);
      }
    } catch {
      if (!cancelled) {
        setHolidayError(true);
      }
    } finally {
      if (!cancelled) {
        setHolidayChecked(true);
      }
    }
  }

  checkPublicHoliday();

  return () => {
    cancelled = true;
  };
}, []);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState(null);
  const [location, setLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [markedDate, setMarkedDate] = useState("");

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const today = getLocalDate();
  const isSunday = new Date(`${today}T12:00:00`).getDay() === 0;

  const hasCollegeCoordinates =
    Number.isFinite(COLLEGE_LOCATION.latitude) &&
    Number.isFinite(COLLEGE_LOCATION.longitude) &&
    COLLEGE_LOCATION.latitude !== null &&
    COLLEGE_LOCATION.longitude !== null;

  const studentId = user?.user_id ?? user?.id ?? user?.userId;

  const checkLocation = () => {
    setMessage("");
    setDistance(null);
    setLocation(null);

    if (!user || !studentId) {
      setStatus("error");
      setMessage("Please log in again before marking attendance.");
      return;
    }

    if (isSunday) {
      setStatus("blocked");
      setMessage("Attendance cannot be marked on Sundays.");
      return;
    }

    if (!hasCollegeCoordinates) {
      setStatus("error");
      setMessage(
        "College coordinates have not been configured yet. Add the correct latitude and longitude first."
      );
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Your browser does not support location services.");
      return;
    }

    setStatus("checking");
    setMessage("Checking your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const calculatedDistance = getDistanceInMetres(
          latitude,
          longitude,
          COLLEGE_LOCATION.latitude,
          COLLEGE_LOCATION.longitude
        );

        setLocation({ latitude, longitude, accuracy });
        setDistance(Math.round(calculatedDistance));

        if (calculatedDistance > COLLEGE_LOCATION.allowedRadius) {
          setStatus("outside");
          setMessage(
            `You are approximately ${Math.round(
              calculatedDistance
            )} metres from the college. Move within the permitted area to continue.`
          );
          return;
        }

        setStatus("verified");
        setMessage(
          `Location verified. You are within the college attendance area. GPS accuracy: ±${Math.round(
            accuracy
          )} metres.`
        );
      },
      (error) => {
        setStatus("error");

        if (error.code === error.PERMISSION_DENIED) {
          setMessage(
            "Location permission was denied. Allow location access in your browser and try again."
          );
        } else if (error.code === error.TIMEOUT) {
          setMessage("Location request timed out. Please try again.");
        } else {
          setMessage(
            "Unable to determine your location. Check your device location settings and try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const markAttendance = async () => {
    if (isSunday) {
      setStatus("blocked");
      setMessage("Attendance cannot be marked on Sundays.");
      return;
    }

    if (status !== "verified" || !location || !studentId) {
      setMessage("Verify your college location before marking attendance.");
      return;
    }

    if (markedDate === today) {
      setMessage("You have already submitted attendance today.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Match this URL to your actual backend attendance-marking route.
      const response = await fetch(
        `${API_BASE}/api/student/attendance/mark`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: studentId,
            date: today,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
  if (response.status === 409) {
    setStatus("marked");
    setMarkedDate(today);
    setMessage(
      data.message || "You have already marked attendance today."
    );
    return;
  }

  throw new Error(
    data.message || "Attendance could not be saved."
  );
}
      setMarkedDate(today);
      setStatus("marked");
      setMessage(data.message || "Attendance marked successfully!");
    } catch (error) {
      setStatus("error");
      setMessage(
        error.message ||
          "Could not connect to the attendance server. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

 const canMark =
  holidayChecked &&
  !holidayError &&
  !holiday &&
  status === "verified" &&
  !isSunday &&
  !saving &&
  markedDate !== today;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/student"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Student Dashboard
        </Link>

        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            AttendEase
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Mark Attendance
          </h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Verify that you are on campus and submit your attendance for
            today.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-900 px-6 py-5 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                📍
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  College Location Verification
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  Your device location is checked before submission.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Attendance date</p>
                <p className="mt-2 font-semibold">
                  {new Date(`${today}T12:00:00`).toLocaleDateString(
                    undefined,
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Weekly schedule</p>
                <p className="mt-2 font-semibold">
                  {isSunday ? "Sunday — Attendance closed" : "Weekday check"}
                </p>
              </div>
            </div>

            {isSunday && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Attendance is unavailable on Sundays. Please return on an
                eligible day.
              </div>
            )}
{!holidayChecked && (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
    Checking public holidays...
  </div>
)}

{holidayError && (
  <div
    role="alert"
    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
  >
    Unable to check public holidays. Please refresh the page before
    marking attendance.
  </div>
)}

{holidayChecked && holiday && (
  <div
    role="status"
    className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
  >
    <h3 className="font-bold">
      🎉 Public Holiday: {holiday.holiday_name}
    </h3>

    {holiday.description && (
      <p className="mt-1 text-sm">{holiday.description}</p>
    )}

    <p className="mt-2 text-sm font-medium">
      Attendance marking is disabled for today.
    </p>
  </div>
)}
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  {status === "verified" || status === "marked"
                    ? "✓"
                    : status === "outside" || status === "error"
                    ? "!"
                    : "◎"}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">Location status</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {status === "idle" &&
                      "Allow location access to check whether you are inside the permitted college area."}
                    {status === "checking" && "Detecting your current location..."}
                    {status === "verified" &&
                      "Your location is within the configured college radius."}
                    {status === "outside" &&
                      "Your current location is outside the permitted radius."}
                    {status === "blocked" &&
                      "Attendance is closed for today."}
                    {status === "marked" &&
                      "Your attendance request was accepted by the server."}
                    {status === "error" && message}
                  </p>

                  {distance !== null && (
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Approximate distance from college: {distance} m
                    </p>
                  )}

                  {message && status !== "error" && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`mt-3 text-sm ${
                        status === "verified" || status === "marked"
                          ? "text-green-700"
                          : status === "outside" || status === "blocked"
                          ? "text-amber-700"
                          : "text-slate-600"
                      }`}
                    >
                      {message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={checkLocation}
                disabled={
  status === "checking" ||
  saving ||
  isSunday ||
  !holidayChecked ||
  holidayError ||
  !!holiday
}
                className="mt-5 w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "checking"
                  ? "Checking Location..."
                  : "📍 Verify My Location"}
              </button>
            </div>

            <button
              type="button"
              onClick={markAttendance}
              disabled={!canMark}
              className="w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {saving
                ? "Submitting Attendance..."
                : status === "marked" || markedDate === today
                ? "✓ Attendance Submitted"
                : "✓ Mark My Attendance"}
            </button>

            {status === "error" && (
              <p role="alert" className="text-sm text-red-600">
                {message}
              </p>
            )}

            <p className="text-center text-xs leading-5 text-slate-400">
              Location permission is required. Attendance is only final
              after the backend accepts the request.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
