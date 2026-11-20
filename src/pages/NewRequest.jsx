import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Paperclip, UploadCloud } from "lucide-react";
import { categories, priorities, createRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function NewRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [values, setValues] = useState({ subject: "", category: "", priority: "Medium", description: "" });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateFile = (selected) => {
    if (!selected) return "Choose a file.";
    if (!ACCEPTED_TYPES.includes(selected.type)) return "Upload a PDF, DOC, DOCX, JPG, or PNG file.";
    if (selected.size > MAX_SIZE) return "File size must be 5 MB or less.";
    return "";
  };

  const handleFile = (selected) => {
    if (!selected) return;
    const error = validateFile(selected);
    if (error) {
      setErrors((current) => ({ ...current, attachment: error }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setErrors((current) => ({ ...current, attachment: "" }));
    setFile(selected);
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.subject.trim()) nextErrors.subject = "Enter a subject.";
    else if (values.subject.trim().length < 5) nextErrors.subject = "Subject must be at least 5 characters.";
    if (!values.category) nextErrors.category = "Select a category.";
    if (!values.description.trim()) nextErrors.description = "Describe what you need help with.";
    else if (values.description.trim().length < 20) nextErrors.description = "Description must be at least 20 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const created = await createRequest({ ...values, studentId: user.id, studentName: user.name, studentEmail: user.email, attachment: file });
      toast("Your request was submitted successfully.");
      navigate(`/student/requests/${created.id}`);
    } catch (error) {
      toast(error.message || "Could not submit your request.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back</button>
      <div><p className="text-sm font-semibold text-brand">NEW REQUEST</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">How can we help?</h1><p className="mt-2 text-sm text-muted">Provide enough detail so the right team can assist you quickly.</p></div>
      <form onSubmit={submit} noValidate className="card mt-6 p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="subject" className="label">Subject</label>
            <input id="subject" value={values.subject} onChange={(event) => update("subject", event.target.value)} className="input" placeholder="Brief summary of your request" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined} />
            {errors.subject && <p id="subject-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.subject}</p>}
          </div>
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" value={values.category} onChange={(event) => update("category", event.target.value)} className="input" aria-invalid={!!errors.category} aria-describedby={errors.category ? "category-error" : undefined}><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
            {errors.category && <p id="category-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.category}</p>}
          </div>
          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <select id="priority" value={values.priority} onChange={(event) => update("priority", event.target.value)} className="input">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" rows="7" value={values.description} onChange={(event) => update("description", event.target.value)} className="input resize-y" placeholder="Include relevant dates, reference numbers, or context..." aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined} />
            <div className="mt-1.5 flex justify-between gap-3"><div>{errors.description && <p id="description-error" className="text-xs font-medium text-red-600">{errors.description}</p>}</div><p className="text-xs text-muted">{values.description.length} characters</p></div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Attachment <span className="font-normal text-muted">(optional)</span></label>
            <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center ${errors.attachment ? "border-red-300 bg-red-50" : "border-slate-300 bg-slate-50/50"}`}>
              <UploadCloud className="h-7 w-7 text-slate-400" />
              {file ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ink"><Paperclip className="h-4 w-4" /> {file.name}</p> : <p className="mt-2 text-sm text-muted">PDF, DOC, DOCX, JPG or PNG up to 5 MB</p>}
              <button type="button" onClick={() => fileRef.current?.click()} className="button-secondary mt-3">{file ? "Replace file" : "Choose file"}</button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleFile(event.target.files?.[0])} className="sr-only" aria-describedby={errors.attachment ? "attachment-error" : undefined} />
            </div>
            {errors.attachment && <p id="attachment-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.attachment}</p>}
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-3 border-t border-line pt-5"><button type="button" onClick={() => navigate(-1)} className="button-secondary" disabled={busy}>Cancel</button><button type="submit" className="button-primary" disabled={busy}>{busy ? "Submitting..." : "Submit request"}</button></div>
      </form>
    </div>
  );
}
