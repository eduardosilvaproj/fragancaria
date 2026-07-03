// Transform src/routes/login.tsx into src/routes/cadastro.tsx (cadastro = sign up).
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "src", "routes", "login.tsx");
const dst = path.join(__dirname, "..", "src", "routes", "cadastro.tsx");
let c = fs.readFileSync(src, "utf-8");

// Component / file name
c = c.replace(/LoginPage/g, "CadastroPage");
c = c.replace(/<Login /g, "<Cadastro ");
c = c.replace(/<LogIn /g, "<UserPlus ");
c = c.replace(/LogIn /g, "UserPlus ");
c = c.replace(/LoginSearch/g, "CadastroSearch");
c = c.replace(/E umu nomeb/); // no-op
// route path
c = c.replace(/\/login/g, "/cadastro");
// texts
c = c.replace(/Entre na sua conta para acompanhar seus pedidos/g,
  "Crie sua conta para salvar pedidos");
c = c.replace(/Acesse sua conta para ver seus pedidos/g,
  "Salve seus pedidos e acompanhe entregas");
c = c.replace(/Esqueci minha senha/g, "");
c = c.replace(/>Entrar</g, ">Criar conta<");
c = c.replace(/\"Entrando\\.\\.\\.\"/g, "\\\"Cadastrando\\.\\.\\.\\\"");
c = c.replace(/Entrando\.\.\./g, "Cadastrando...");
c = c.replace(/>Entrar</g, ">Criar conta<");
c = c.replace(/Ja tem conta\?/g, "Ja tem conta?");
c = c.replace(/Nao tem conta\?/g, "Primeira vez aqui?");
c = c.replace(/Cadastre-se/g, "Entrar");
// add name field + change signIn -> signUp
c = c.replace(/signInWithPassword/g, "signUp");
c = c.replace(/mapAuthError\(\"E-mail ou senha incorretos\\.\"\)/g,
  "mapAuthError(\\\"Este e-mail ja esta cadastrado. Tente entrar.\\\")");
// fix the above
c = c.replace('mapAuthError(\\"Este e-mail ja esta cadastrado. Tente entrar.\\")',
  'mapAuthError("Este e-mail ja esta cadastrado. Tente entrar.")');
// add full_name field before the email input
const emailLabel = '<label className="block text-sm font-medium text-[#0F3A3E] mb-1">E-mail</label>';
const nameBlock =
  '<div>\n' +
  '  <label className="block text-sm font-medium text-[#0F3A3E] mb-1">Nome completo</label>\n' +
  '  <input\n' +
  '    type="text"\n' +
  '    required\n' +
  '    value={fullName}\n' +
  '    onChange={(e) => setFullName(e.target.value)}\n' +
  '    className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"\n' +
  '    placeholder="Seu nome"\n' +
  '  />\n' +
  '</div>\n' +
  emailLabel;
c = c.replace(emailLabel, nameBlock);

// rename state vars
c = c.replace(/const \[email, setEmail\]/g, "const [email, setEmail]");
c = c.replace(/const \[password, setPassword\]/g, "const [password, setPassword]");
// add fullName
c = c.replace(
  'const [email, setEmail] = useState("");',
  'const [fullName, setFullName] = useState("");\n  const [email, setEmail] = useState("");'
);
// add full_name to signUp options
c = c.replace(
  /await supabase\.auth\.signUp\(\{[\s\S]*?\}\);/,
  'await supabase.auth.signUp({\n        email: email.trim(),\n        password,\n        options: {\n          data: { full_name: fullName.trim() },\n          emailRedirectTo: origin + "/login",\n        },\n      });'
);

fs.writeFileSync(dst, c, "utf-8");
console.log("wrote", dst, "len=", c.length);
