import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  Info,
  Edit3,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  CheckSquare,
  Clock
} from "lucide-react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  color?: "indigo" | "violet" | "emerald" | "rose" | "amber" | "muted";
}

interface NotesAppProps {
  userId: string;
}

const colorMap = {
  muted: { border: "rgba(255,255,255,0.06)", bg: "rgba(255,255,255,0.01)", hover: "rgba(255,255,255,0.02)", active: "rgba(255,255,255,0.04)", accent: "rgba(255,255,255,0.25)" },
  indigo: { border: "rgba(99, 102, 241, 0.15)", bg: "rgba(99, 102, 241, 0.02)", hover: "rgba(99, 102, 241, 0.04)", active: "rgba(99, 102, 241, 0.06)", accent: "#6366f1" },
  violet: { border: "rgba(139, 92, 246, 0.15)", bg: "rgba(139, 92, 246, 0.02)", hover: "rgba(139, 92, 246, 0.04)", active: "rgba(139, 92, 246, 0.06)", accent: "#8b5cf6" },
  emerald: { border: "rgba(16, 185, 129, 0.15)", bg: "rgba(16, 185, 129, 0.02)", hover: "rgba(16, 185, 129, 0.04)", active: "rgba(16, 185, 129, 0.06)", accent: "#10b981" },
  rose: { border: "rgba(244, 63, 94, 0.15)", bg: "rgba(244, 63, 94, 0.02)", hover: "rgba(244, 63, 94, 0.04)", active: "rgba(244, 63, 94, 0.06)", accent: "#f43f5e" },
  amber: { border: "rgba(245, 158, 11, 0.15)", bg: "rgba(245, 158, 11, 0.02)", hover: "rgba(245, 158, 11, 0.04)", active: "rgba(245, 158, 11, 0.06)", accent: "#f59e0b" },
};

export const NotesApp: React.FC<NotesAppProps> = ({ userId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Load Notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        if (db && userId) {
          const docRef = doc(db, "user", userId, "productivity", "notes");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().notes) {
            const fetchedNotes: Note[] = docSnap.data().notes;
            setNotes(fetchedNotes);
            if (fetchedNotes.length > 0) {
              setActiveNoteId(fetchedNotes[0].id);
            }
            setLoading(false);
            return;
          }
        }
      } catch (e: any) {
        console.warn("Firestore notes fetch failed:", e);
        setErrorMsg("Unable to load notes from cloud. Please retry.");
        setTimeout(() => setErrorMsg(""), 3000);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [userId]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || null;

  // Handle setting text inside editorRef when note selection changes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.getAttribute("data-note-id") !== activeNote.id) {
        editorRef.current.innerHTML = activeNote.body || "";
        editorRef.current.setAttribute("data-note-id", activeNote.id);
      }
    } else if (editorRef.current && !activeNote) {
      editorRef.current.innerHTML = "";
      editorRef.current.removeAttribute("data-note-id");
    }
  }, [activeNoteId, loading]);

  // Save Notes with DB sync
  const performSave = async (updatedNotes: Note[]) => {
    setIsSaving(true);
    try {
      if (db && userId) {
        const docRef = doc(db, "user", userId, "productivity", "notes");
        await setDoc(docRef, { notes: updatedNotes }, { merge: true });
        setHasUnsavedChanges(false);
      }
    } catch (e: any) {
      console.warn("Firestore notes save failed:", e);
      setErrorMsg("Cloud save failed. Your latest changes may not be persisted.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await performSave(notes);
  };

  const handleCreateNote = async () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      body: "",
      color: "muted",
      updatedAt: new Date().toISOString()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    setActiveNoteId(newNote.id);
    setHasUnsavedChanges(false);

    // Structural changes (create) save immediately
    setIsSaving(true);
    try {
      if (db && userId) {
        const docRef = doc(db, "user", userId, "productivity", "notes");
        await setDoc(docRef, { notes: updated }, { merge: true });
      }
    } catch (e: any) {
      console.warn("Firestore notes create failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this note?")) {
      const updated = notes.filter((n) => n.id !== noteId);
      setNotes(updated);
      
      if (activeNoteId === noteId) {
        setActiveNoteId(updated.length > 0 ? updated[0].id : null);
      }
      setHasUnsavedChanges(false);

      // Structural changes (delete) save immediately
      setIsSaving(true);
      try {
        if (db && userId) {
          const docRef = doc(db, "user", userId, "productivity", "notes");
          await setDoc(docRef, { notes: updated }, { merge: true });
        }
      } catch (e: any) {
        console.warn("Firestore notes delete failed:", e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpdateNote = (field: "title" | "body" | "color", value: string) => {
    if (!activeNoteId) return;

    const updated = notes.map((note) => {
      if (note.id === activeNoteId) {
        return {
          ...note,
          [field]: value,
          updatedAt: new Date().toISOString()
        };
      }
      return note;
    });

    if (field !== "color") {
      const activeNoteIndex = updated.findIndex((n) => n.id === activeNoteId);
      if (activeNoteIndex > 0) {
        const [activeNote] = updated.splice(activeNoteIndex, 1);
        updated.unshift(activeNote);
      }
    }

    setNotes(updated);
    setHasUnsavedChanges(true);
  };

  // Extract raw text for snippets and statistics
  const getRawTextFromHTML = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.innerText || tempDiv.textContent || "";
  };

  const getWordCount = (html: string) => {
    const text = getRawTextFromHTML(html);
    const cleaned = text.trim().replace(/\s+/g, " ");
    return cleaned === "" ? 0 : cleaned.split(" ").length;
  };

  const getChecklistStats = (html: string) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const checkboxes = tempDiv.querySelectorAll("input[type='checkbox']");
    const total = checkboxes.length;
    const completed = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked).length;
    return { total, completed };
  };

  // Editor rich text command executor
  const applyCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleUpdateNote("body", editorRef.current.innerHTML);
    }
  };

  const handleInsertTodo = () => {
    // Insert checklist item inside editor
    const todoHTML = `<div class="todo-item" style="display: flex; align-items: center; gap: 8.5px; margin: 4px 0;"><input type="checkbox" class="custom-checkbox" style="cursor: pointer;" />&nbsp;</div>`;
    applyCommand("insertHTML", todoHTML);
  };

  const handleInsertTimestamp = () => {
    const now = new Date();
    const timeStr = ` [${now.toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}] `;
    applyCommand("insertHTML", timeStr);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      handleUpdateNote("body", editorRef.current.innerHTML);
    }
  };

  // Toggle checklist attributes in innerHTML and database on checkbox check/uncheck clicks
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const isChecked = (target as HTMLInputElement).checked;
      if (isChecked) {
        target.setAttribute("checked", "true");
      } else {
        target.removeAttribute("checked");
      }
      if (editorRef.current) {
        handleUpdateNote("body", editorRef.current.innerHTML);
      }
    }
  };

  // Auto-duplicate todo checkbox on hitting Enter inside todo row
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.startContainer;

      // Find todo-item block container
      let currentBlock: HTMLElement | null = null;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains("todo-item")) {
          currentBlock = node as HTMLElement;
          break;
        }
        node = node.parentNode!;
      }

      if (currentBlock) {
        const textContent = currentBlock.innerText || currentBlock.textContent || "";
        const cleanText = textContent.replace(/\u00a0/g, " ").trim();

        if (cleanText === "") {
          // If empty checkbox row, convert it to a standard paragraph
          e.preventDefault();
          
          const normalDiv = document.createElement("div");
          normalDiv.innerHTML = "<br>";
          currentBlock.parentNode!.replaceChild(normalDiv, currentBlock);
          
          // Place cursor on normal div
          const newRange = document.createRange();
          newRange.setStart(normalDiv, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          if (editorRef.current) {
            handleUpdateNote("body", editorRef.current.innerHTML);
          }
          return;
        }

        // Duplicate checkbox row
        e.preventDefault();
        
        const newTodo = document.createElement("div");
        newTodo.className = "todo-item";
        newTodo.style.display = "fin-flex";
        newTodo.style.display = "flex";
        newTodo.style.alignItems = "center";
        newTodo.style.gap = "8.5px";
        newTodo.style.margin = "4px 0";
        newTodo.innerHTML = `<input type="checkbox" class="custom-checkbox" style="cursor: pointer;" />`;
        
        const textNode = document.createTextNode("\u00a0");
        newTodo.appendChild(textNode);
        
        if (currentBlock.nextSibling) {
          currentBlock.parentNode!.insertBefore(newTodo, currentBlock.nextSibling);
        } else {
          currentBlock.parentNode!.appendChild(newTodo);
        }
        
        const newRange = document.createRange();
        newRange.setStart(textNode, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        if (editorRef.current) {
          handleUpdateNote("body", editorRef.current.innerHTML);
        }
      }
    }
  };

  const filteredNotes = notes.filter((n) => {
    const text = getRawTextFromHTML(n.body).toLowerCase();
    const title = n.title.toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || text.includes(query);
  });

  const activeTheme = colorMap[activeNote?.color || "muted"];

  return (
    <div className="micro-app-container notes-app">
      <div className="app-header-area">
        <div>
          <h2 className="app-title">Quick Notes</h2>
          <p className="app-subtitle">Capture thoughts instantly. Premium WYSIWYG live rich text editor.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="app-alert warn">
          <Info className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="notes-app-layout">
        {/* Left Side: Notes list & Search */}
        <div className="notes-sidebar">
          <div className="sidebar-search-actions">
            <div className="search-bar-wrapper">
              <Search className="search-icon w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="custom-input search-input"
              />
            </div>
            <button className="primary-btn square-btn" onClick={handleCreateNote} title="New Note">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="app-loader">
              <div className="spinner"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-sidebar-state">
              <p>{searchQuery ? "No matches found." : "No notes yet. Click + to add one!"}</p>
            </div>
          ) : (
            <div className="notes-list-items">
              {filteredNotes.map((note) => {
                const isSelected = note.id === activeNoteId;
                const noteTheme = colorMap[note.color || "muted"];
                const checklist = getChecklistStats(note.body);
                const snippet = getRawTextFromHTML(note.body);
                
                return (
                  <div
                    key={note.id}
                    className={`note-list-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveNoteId(note.id)}
                    style={isSelected ? {
                      borderColor: noteTheme.accent,
                      backgroundColor: noteTheme.active,
                      borderLeft: `3px solid ${noteTheme.accent}`
                    } : {
                      borderColor: noteTheme.border,
                      backgroundColor: noteTheme.bg
                    }}
                  >
                    <div className="note-card-header">
                      <span className="note-card-title">{note.title || "Untitled Note"}</span>
                      <button
                        className="note-card-delete"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="note-card-snippet">
                      {snippet ? snippet.substring(0, 60) + (snippet.length > 60 ? "..." : "") : "Empty note..."}
                    </p>
                    <div className="fin-flex fin-justify-between fin-items-center fin-mt-1">
                      <span className="note-card-date">
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </span>
                      {checklist.total > 0 && (
                        <span 
                          className="text-[9px] px-1.5 py-0.5 fin-rounded-sm font-bold border" 
                          style={{ 
                            color: noteTheme.accent,
                            borderColor: `${noteTheme.accent}33`,
                            backgroundColor: `${noteTheme.accent}11`
                          }}
                        >
                          {checklist.completed}/{checklist.total} Tasks
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Active Note Editor */}
        <div 
          className="notes-editor-pane"
          style={{
            border: activeNote ? `1px solid ${activeTheme.border}` : "1px solid var(--border-color)",
            background: activeNote ? activeTheme.bg : "transparent",
            borderRadius: "var(--radius-lg)",
            padding: "20px"
          }}
        >
          {activeNote ? (
            <div className="note-editor-wrapper">
              <div className="editor-meta-header" style={{ borderColor: `${activeTheme.accent}15` }}>
                <div className="fin-flex fin-items-center fin-gap-2">
                  <span className="editor-stats" style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>
                    {getWordCount(activeNote.body)} words
                  </span>
                  
                  {/* Theme Color selector dots */}
                  <div className="fin-flex fin-items-center fin-gap-1.5 ml-2 border-l border-white/10 pl-3">
                    {(["muted", "indigo", "violet", "emerald", "rose", "amber"] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleUpdateNote("color", color)}
                        className="w-3.5 h-3.5 fin-rounded-full transition border border-white/10 hover:scale-110"
                        style={{ 
                          backgroundColor: colorMap[color].accent, 
                          boxShadow: activeNote.color === color ? `0 0 6px ${colorMap[color].accent}` : "none",
                          opacity: activeNote.color === color ? 1 : 0.4
                        }}
                        title={`Apply ${color} theme`}
                      />
                    ))}
                  </div>
                </div>

                <div className="fin-flex fin-items-center fin-gap-2">
                  <span 
                    className="save-status"
                    style={{ 
                      color: hasUnsavedChanges ? "var(--color-amber)" : "var(--text-muted)",
                      fontWeight: hasUnsavedChanges ? 600 : 400 
                    }}
                  >
                    {isSaving ? "Saving..." : hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                  </span>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="notes-save-btn"
                    style={{
                      padding: "6px 14px",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: hasUnsavedChanges ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.04)",
                      color: hasUnsavedChanges ? "#fff" : "var(--text-muted)",
                      boxShadow: hasUnsavedChanges ? "0 4px 10px rgba(16, 185, 129, 0.18)" : "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Note Title"
                value={activeNote.title}
                onChange={(e) => handleUpdateNote("title", e.target.value)}
                className="note-title-input"
              />

              {/* Formatting WYSIWYG Toolbar */}
              <div className="notes-toolbar">
                <button
                  type="button"
                  onClick={() => applyCommand("bold")}
                  className="notes-toolbar-btn"
                  title="Bold (Selection)"
                >
                  <Bold />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand("italic")}
                  className="notes-toolbar-btn"
                  title="Italic (Selection)"
                >
                  <Italic />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand("formatBlock", "<h1>")}
                  className="notes-toolbar-btn"
                  title="Heading 1"
                >
                  <Heading />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand("insertUnorderedList")}
                  className="notes-toolbar-btn"
                  title="Bullet List"
                >
                  <List />
                </button>
                <button
                  type="button"
                  onClick={() => applyCommand("insertOrderedList")}
                  className="notes-toolbar-btn"
                  title="Numbered List"
                >
                  <ListOrdered />
                </button>
                <button
                  type="button"
                  onClick={handleInsertTodo}
                  className="notes-toolbar-btn"
                  title="Add Checklist checkbox"
                >
                  <CheckSquare />
                </button>
                <button
                  type="button"
                  onClick={handleInsertTimestamp}
                  className="notes-toolbar-btn"
                  style={{ marginLeft: "auto" }}
                  title="Insert Timestamp"
                >
                  <Clock />
                </button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onClick={handleEditorClick}
                onKeyDown={handleEditorKeyDown}
                className="note-body-textarea note-body-editor"
                {...{ placeholder: "Start typing down your ideas, outlines, or checklists here..." }}
                style={{
                  outline: "none",
                  flex: 1,
                  overflowY: "auto",
                  minHeight: "300px"
                }}
              />
            </div>
          ) : (
            <div className="empty-state-view centered">
              <div className="empty-icon-wrapper">
                <Edit3 className="w-8 h-8 text-indigo-400" />
              </div>
              <h4>No Active Note</h4>
              <p>Select a note from the sidebar or click the "+" button to create a new scratchpad.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
