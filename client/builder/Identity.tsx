import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  $,
  clickControl,
  hideAfterMount,
  inputValue,
  setLegacyInput,
} from "./legacy";
type IdentityValues = {
  name: string;
  age: string;
  origin: string;
  background: string;
  languages: string;
};
function read(): IdentityValues {
  return {
    name: inputValue("portal-name"),
    age: inputValue("portal-age"),
    origin: inputValue("portal-origin"),
    background: inputValue("portal-background"),
    languages: $("languages-selection")?.textContent || "Языки пока не выбраны",
  };
}
export function Identity({ legacyIdentity }: { legacyIdentity: HTMLElement }) {
  const [values, setValues] = useState(read);
  const languageButton = useRef<HTMLButtonElement>(null),
    opened = useRef(false);
  useLayoutEffect(() => hideAfterMount(legacyIdentity), [legacyIdentity]);
  useEffect(() => {
    const refresh = () => setValues(read());
    const observer = new MutationObserver(refresh);
    const sources = [
      ...document.querySelectorAll<HTMLElement>(
        ".ident-l .line,.background-card .line",
      ),
      $("languages-selection"),
    ].filter((x): x is HTMLElement => Boolean(x));
    for (const n of sources)
      observer.observe(n, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    const controls = [
      "portal-name",
      "portal-age",
      "portal-origin",
      "portal-background",
      "portal-languages",
    ]
      .map((id) => $(id))
      .filter((n): n is HTMLElement => !!n);
    for (const n of controls) n.addEventListener("input", refresh);
    document.addEventListener("katarsis:active-character", refresh);
    const dialog = $<HTMLDialogElement>("languages-dialog");
    const onClose = () => {
      if (opened.current) {
        opened.current = false;
        requestAnimationFrame(() => languageButton.current?.focus());
      }
      refresh();
    };
    dialog?.addEventListener("close", onClose);
    refresh();
    return () => {
      observer.disconnect();
      for (const n of controls) n.removeEventListener("input", refresh);
      document.removeEventListener("katarsis:active-character", refresh);
      dialog?.removeEventListener("close", onClose);
    };
  }, []);
  function update(
    key: keyof Pick<IdentityValues, "name" | "age" | "origin" | "background">,
    value: string,
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    const field = {
      name: "portal-name",
      age: "portal-age",
      origin: "portal-origin",
      background: "portal-background",
    }[key];
    setLegacyInput(field, value);
  }
  return (
    <>
      <label className="portal-form-label portal-span-two">
        Имя персонажа
        <input
          id="react-portal-name"
          aria-label="Имя персонажа"
          placeholder="Как тебя зовут?"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </label>
      <label className="portal-form-label">
        Возраст
        <input
          id="react-portal-age"
          placeholder="Возраст"
          value={values.age}
          onChange={(e) => update("age", e.target.value)}
        />
      </label>
      <label className="portal-form-label">
        Откуда
        <input
          id="react-portal-origin"
          placeholder="Город, деревня или дальняя земля"
          value={values.origin}
          onChange={(e) => update("origin", e.target.value)}
        />
      </label>
      <div className="portal-form-label portal-span-two">
        Языки
        <button
          ref={languageButton}
          type="button"
          aria-controls="languages-dialog"
          aria-haspopup="dialog"
          className="portal-button"
          onClick={() => {
            opened.current = true;
            clickControl("languages-open");
          }}
        >
          Выбрать языки
        </button>
        <span className="languages-selection">{values.languages}</span>
      </div>
      <label className="portal-form-label portal-span-two">
        Предыстория
        <textarea
          id="react-portal-background"
          aria-label="Предыстория"
          placeholder="Что привело тебя к приключениям?"
          rows={4}
          value={values.background}
          onChange={(e) => update("background", e.target.value)}
        />
      </label>
    </>
  );
}
