import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
const BACKEND_URL = import.meta.env.VITE_BACKEND;

const API = `${BACKEND_URL}/api`;

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  contact: "",
  course: "",
  enrollment_date: "",
  duration: "",
};

export default function StudentProfile() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const userId = user?.user_id;

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Admin starts in add mode. Students always edit their own profile.
  const [mode, setMode] = useState(
    isAdmin ? "add" : "edit"
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const showMessage = useCallback((text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  // Redirect if the user is not logged in.
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Load existing students for the admin dropdown.
  const loadStudents = useCallback(async () => {
    try {
      const response = await fetch(`${API}/students`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load students.");
      }

      setStudents(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      showMessage(error.message || "Unable to load students.", "error");
      return [];
    }
  }, [showMessage]);

  useEffect(() => {
    if (user && isAdmin) {
      loadStudents();
    }
  }, [user, isAdmin, loadStudents]);

  // Load a student's existing profile.
  useEffect(() => {
    if (!user) return;

    if (isAdmin && mode === "add") {
      setForm(emptyForm);
      setLoading(false);
      return;
    }

    const id = isAdmin
      ? selectedStudentId
      : String(userId ?? "");

    if (!id) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `${API}/student/profile/${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile.");
        }

        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          password: "",
          contact: data.contact || "",
          course: data.course || "",
          enrollment_date: data.enrollment_date
            ? String(data.enrollment_date).slice(0, 10)
            : "",
          duration:
            data.duration == null ? "" : String(data.duration),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          showMessage(error.message || "Unable to load profile.", "error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [
    user,
    userId,
    isAdmin,
    selectedStudentId,
    mode,
    showMessage,
  ]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Reset the form for adding a new student.
  function resetForm() {
    setSelectedStudentId("");
    setForm(emptyForm);
    setMode(isAdmin ? "add" : "edit");
    setMessage("");
  }

  // Add a new student to the existing PostgreSQL database.
  async function addStudent() {
    const response = await fetch(`${API}/students/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        contact: form.contact.trim(),
        course: form.course.trim(),
        enrollment_date: form.enrollment_date || null,
        duration: Number(form.duration),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to register student.");
    }

    const newUserId = data.user?.user_id;

    if (!newUserId) {
      throw new Error(
        "Student was registered, but the response did not contain a user ID."
      );
    }

    setSelectedStudentId(String(newUserId));
    setForm((previous) => ({
      ...previous,
      password: "",
    }));
    setMode("edit");

    await loadStudents();

    showMessage(
      data.message || "Student added successfully to the database."
    );
  }

  // Update an existing student's profile.
  async function updateStudent() {
    const id = isAdmin
      ? selectedStudentId
      : String(userId ?? "");

    if (!id) {
      throw new Error("Please select a student first.");
    }

    const response = await fetch(
      `${API}/student/profile/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          contact: form.contact.trim(),
          course: form.course.trim(),
          enrollment_date: form.enrollment_date || null,
          duration: Number(form.duration),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update profile.");
    }

    await loadStudents();

    showMessage(
      data.message || "Student profile updated successfully."
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (
      !form.first_name.trim() ||
      !form.email.trim() ||
      !form.course.trim() ||
      !String(form.duration).trim()
    ) {
      showMessage(
        "Please fill in first name, email, course, and duration.",
        "error"
      );
      return;
    }

    const duration = Number(form.duration);

    if (!Number.isInteger(duration) || duration <= 0) {
      showMessage(
        "Course duration must be a positive whole number.",
        "error"
      );
      return;
    }

    if (mode === "add") {
      if (!form.password) {
        showMessage(
          "Please enter a password for the new student.",
          "error"
        );
        return;
      }

      if (form.password.length < 8) {
        showMessage(
          "Password must contain at least 8 characters.",
          "error"
        );
        return;
      }
    }

    if (mode === "edit" && isAdmin && !selectedStudentId) {
      showMessage("Please select a student to update.", "error");
      return;
    }

    setSaving(true);

    try {
      if (isAdmin && mode === "add") {
        await addStudent();
      } else {
        await updateStudent();
      }
    } catch (error) {
      showMessage(
        error.message || "Unable to save student details.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-6 text-[#1e293b] max-sm:p-3">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Student Profile Update
            </h1>

            <p className="mt-2 text-sm text-[#64748b]">
              {isAdmin
                ? "Add students or update existing student details."
                : "View and update your profile details."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(isAdmin ? "/admin" : "/student")
            }
            className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            ← Back to Dashboard
          </button>
        </header>

        <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          {isAdmin && (
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetForm}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === "add"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                + Add New Student
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("edit");
                  setMessage("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === "edit"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Update Existing Student
              </button>
            </div>
          )}

          {isAdmin && mode === "edit" && (
            <div className="mb-5">
              <label
                htmlFor="studentSelector"
                className="mb-2 block text-sm font-semibold"
              >
                Select Student
              </label>

              <select
                id="studentSelector"
                value={selectedStudentId}
                onChange={(event) =>
                  setSelectedStudentId(event.target.value)
                }
                disabled={loading || saving}
                className="w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-100"
              >
                <option value="">Choose a student</option>

                {students.map((student) => (
                  <option
                    key={student.user_id}
                    value={String(student.user_id)}
                  >
                    {student.name} — {student.email}
                  </option>
                ))}
              </select>

              {!students.length && (
                <p className="mt-2 text-sm text-slate-500">
                  No students were found. Add a student first, or check
                  your backend and database connection.
                </p>
              )}
            </div>
          )}

          {loading && (
            <p className="mb-4 text-sm text-slate-500">
              Loading student profile...
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              {[
                ["first_name", "First Name"],
                ["last_name", "Last Name"],
                ["email", "Email Address"],
                ["contact", "Phone Number"],
                ["course", "Course / Department"],
                ["enrollment_date", "Enrollment Date"],
                ["duration", "Course Duration (years)"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label
                    htmlFor={name}
                    className="mb-2 block text-sm font-semibold"
                  >
                    {label}
                  </label>

                  <input
                    id={name}
                    name={name}
                    type={
                      name === "email"
                        ? "email"
                        : name === "enrollment_date"
                        ? "date"
                        : name === "duration"
                        ? "number"
                        : "text"
                    }
                    min={name === "duration" ? 1 : undefined}
                    step={name === "duration" ? 1 : undefined}
                    value={form[name]}
                    onChange={handleChange}
                    required={[
                      "first_name",
                      "email",
                      "course",
                      "duration",
                    ].includes(name)}
                    disabled={
                      loading ||
                      saving ||
                      (isAdmin && mode === "edit" && !selectedStudentId)
                    }
                    autoComplete={
                      name === "email" ? "email" : "off"
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                </div>
              ))}

              {isAdmin && mode === "add" && (
                <div className="col-span-2 max-sm:col-span-1">
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Temporary Login Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    placeholder="At least 8 characters"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Your backend hashes this password before storing it.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                saving ||
                (isAdmin && mode === "edit" && !selectedStudentId)
              }
              className="mt-6 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : isAdmin && mode === "add"
                ? "Add Student to Database"
                : "Save Profile Changes"}
            </button>
          </form>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-lg p-3 text-sm ${
                messageType === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-800"
              }`}
            >
              {message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
