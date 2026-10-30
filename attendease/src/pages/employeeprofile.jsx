
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND;

const initialForm = {
  first_name: "",
  last_name: "",
  contact: "",
  designation: "",
  date_of_join: "",
};

export default function EmployeeProfile() {
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          throw new Error("Please log in to view your employee details.");
        }

        const user = JSON.parse(savedUser);
        const id = user.user_id ?? user.id ?? user.userId;

        if (!id) {
          throw new Error("User ID not found. Please log in again.");
        }

        setUserId(id);

        const response = await fetch(
          `${BACKEND_URL}/api/admin/profile/${encodeURIComponent(id)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load employee details.");
        }

        const employee = data.employee ?? data.profile ?? data;

        setForm({
          first_name: employee.first_name ?? "",
          last_name: employee.last_name ?? "",
          contact: employee.contact ?? "",
          designation: employee.designation ?? "",
          date_of_join: employee.date_of_join
            ? String(employee.date_of_join).slice(0, 10)
            : "",
        });
      } catch (err) {
        setError(err.message || "Unable to load employee details.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!userId) {
      setError("User ID is missing. Please log in again.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/profile/${encodeURIComponent(userId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save employee details.");
      }

      const employee = data.employee ?? data.profile ?? data;

      if (employee.first_name !== undefined) {
        setForm({
          first_name: employee.first_name ?? "",
          last_name: employee.last_name ?? "",
          contact: employee.contact ?? "",
          designation: employee.designation ?? "",
          date_of_join: employee.date_of_join
            ? String(employee.date_of_join).slice(0, 10)
            : "",
        });
      }

      setMessage("Employee details updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to save employee details.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    {
      label: "First Name",
      name: "first_name",
      type: "text",
      required: true,
    },
    {
      label: "Last Name",
      name: "last_name",
      type: "text",
      required: false,
    },
    {
      label: "Contact Number",
      name: "contact",
      type: "tel",
      required: false,
    },
    {
      label: "Designation",
      name: "designation",
      type: "text",
      required: true,
    },
    {
      label: "Date of Joining",
      name: "date_of_join",
      type: "date",
      required: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Employee Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            Employee Profile Update
          </h1>
          <p className="mt-2 text-slate-500">
            View and update employee information.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="font-medium text-slate-600">
              Loading employee details...
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="h-2 bg-blue-600" />

            <div className="p-6 sm:p-8">
              <div className="mb-7 flex items-center gap-4 border-b border-slate-200 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-700">
                  ♙
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Employee Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    User ID: {userId ?? "—"}
                  </p>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div
                      key={field.name}
                      className={
                        field.name === "designation"
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <label
                        htmlFor={field.name}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </label>

                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={form[field.name]}
                        onChange={handleChange}
                        required={field.required}
                        maxLength={
                          field.name === "contact" ? 15 : undefined
                        }
                        pattern={
                          field.name === "contact"
                            ? "[0-9+() -]{0,15}"
                            : undefined
                        }
                        disabled={saving}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                  <Link
                    to="/admin"
                    className="rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={saving || loading}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-500">
          Changes are intended to be saved to your existing admin_details
          database table.
        </p>
      </div>
    </div>
  );
}
