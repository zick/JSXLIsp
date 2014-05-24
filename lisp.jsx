import "js.jsx";

class LObj {
  var tag : string = 'NO TAG';
  function str() : string { return ""; }
  function num() : number { return 0; }
  function car() : LObj { return new LObj; }
  function cdr() : LObj { return new LObj; }
  function set_car(obj : LObj) : void {}
  function set_cdr(obj : LObj) : void {}
  function args() : LObj { return new LObj; }
  function body() : LObj { return new LObj; }
  function env() : LObj { return new LObj; }
  function fn() : function (:LObj) : LObj { return (args : LObj) -> args; }
}

class Nil extends LObj {
  static var nil : Nil = new Nil;
  function constructor() { this.tag = 'nil'; }
  override function str() : string { return "nil"; }
}

class Error1 extends LObj {
  var msg_ : string;
  function constructor(msg : string) {
    this.tag = 'error';
    this.msg_ = msg;
  }
  override function str() : string { return this.msg_; }
}

class Symbol extends LObj {
  static var sym_table_ : Map.<Symbol> = {};
  static function make(str : string) : LObj {
    if (str == 'nil') {
      return Nil.nil;
    } else if (!(str in Symbol.sym_table_)) {
      Symbol.sym_table_[str] = new Symbol(str);
    }
    return Symbol.sym_table_[str];
  }

  var name_ : string;
  function constructor(name : string) {
    this.tag = 'sym';
    this.name_ = name;
  }
  override function str() : string { return this.name_; }
}

class Num extends LObj {
  var num_ : number;
  function constructor(num : number) {
    this.tag = 'num';
    this.num_ = num;
  }
  override function num() : number { return this.num_; }
}

class Cons extends LObj {
  var car_ : LObj;
  var cdr_ : LObj;
  function constructor(a : LObj, d : LObj) {
    this.tag = 'cons';
    this.car_ = a;
    this.cdr_ = d;
  }
  override function car() : LObj { return this.car_; }
  override function cdr() : LObj { return this.cdr_; }
  override function set_car(x : LObj) : void { this.car_ = x; }
  override function set_cdr(x : LObj) : void { this.cdr_ = x; }

  static function safeCar(obj : LObj) : LObj {
    if (obj.tag == 'cons') { return obj.car(); }
    return Nil.nil;
  }
  static function safeCdr(obj : LObj) : LObj {
    if (obj.tag == 'cons') { return obj.cdr(); }
    return Nil.nil;
  }
}

class Subr extends LObj {
  var fn_ : function (:LObj) : LObj;
  function constructor(fn : function (:LObj) : LObj) {
    this.tag = 'subr';
    this.fn_ = fn;
  }
  override function fn() : function (:LObj) : LObj { return this.fn_; }
}

class Expr extends LObj {
  var args_ : LObj;
  var body_ : LObj;
  var env_ : LObj;
  function constructor(args : LObj, env : LObj) {
    this.tag = 'expr';
    this.args_ = Cons.safeCar(args);
    this.body_ = Cons.safeCdr(args);
    this.env_ = env;
  }
  override function args() : LObj { return this.args_; }
  override function body() : LObj { return this.body_; }
  override function env() : LObj { return this.env_; }
}

class ParserState {
  var obj : LObj;
  var next : string;
  function constructor(o : LObj, n : string) {
    this.obj = o;
    this.next = n;
  }
}

class Lisp {
  var kLPar = '(';
  var kRPar = ')';
  var kQuote = "'";
  var g_env = new Cons(Nil.nil, Nil.nil);

  function nreverse(lst : LObj) : LObj {
    var ret : LObj = Nil.nil;
    while (lst.tag == 'cons') {
      var tmp = lst.cdr();
      lst.set_cdr(ret);
      ret = lst;
      lst = tmp;
    }
    return ret;
  }

  function pairlis(lst1 : LObj, lst2 : LObj) : LObj {
    var ret : LObj = Nil.nil;
    while (lst1.tag == 'cons' && lst2.tag == 'cons') {
      ret = new Cons(new Cons(lst1.car(), lst2.car()), ret);
      lst1 = lst1.cdr();
      lst2 = lst2.cdr();
    }
    return this.nreverse(ret);
  }

  function isDelimiter(c : string) : boolean {
    return c == this.kLPar || c == this.kRPar || c == this.kQuote ||
           c.match(/\s+/);
  }

  function skipSpaces(str : string) : string {
    return str.replace(/^\s+/, '');
  }

  function makeNumOrSym(str : string) : LObj {
    var num = str as number;
    if (num.toString() == str) {
      return new Num(num);
    }
    return Symbol.make(str);
  }

  function readAtom(str : string) : ParserState {
    var next = '';
    for (var i = 0; i < str.length; i++) {
      if (this.isDelimiter(str.charAt(i))) {
        next = str.slice(i);

        str = str.slice(0, i);
        break;
      }
    }
    return new ParserState(this.makeNumOrSym(str), next);
  }

  function read(str : string) : ParserState {
    str = this.skipSpaces(str);
    if (str.length == 0) {
      return new ParserState(new Error1('empty input'), '');
    } else if (str.charAt(0) == this.kRPar) {
      return new ParserState(new Error1('invalid syntax: ' + str), '');
    } else if (str.charAt(0) == this.kLPar) {
      return this.readList(str.slice(1));
    } else if (str.charAt(0) == this.kQuote) {
      var s = this.read(str.slice(1));
      return new ParserState(
          new Cons(Symbol.make('quote'), new Cons(s.obj, Nil.nil)),
          s.next);
    }
    return this.readAtom(str);
  }

  function readList(str : string) : ParserState {
    var ret : LObj = Nil.nil;
    while (true) {
      str = this.skipSpaces(str);
      if (str.length == 0) {
        return new ParserState(new Error1('unfinished parenthesis'), '');
      } else if (str.charAt(0) == this.kRPar) {
        break;
      }
      var s = this.read(str);
      if (s.obj.tag == 'error') {
        return new ParserState(s.obj, '');
      }
      ret = new Cons(s.obj, ret);
      str = s.next;
    }
    return new ParserState(this.nreverse(ret), str.slice(1));
  }

  function printObj(obj : LObj) : string {
    var tag = obj.tag;
    if (tag == 'sym' || tag == 'nil') {
      return obj.str();
    } else if (tag == 'num') {
      return obj.num().toString();
    } else if (tag == 'error') {
      return '<error: ' + obj.str() + '>';
    } else if (tag == 'cons') {
      return this.printList(obj);
    } else if (tag == 'subr' || tag == 'expr') {
      return '<' + tag + '>';
    }
    return '<unknown>';
  }

  function printList(obj : LObj) : string {
    var ret = '';
    var first = true;
    while (obj.tag == 'cons') {
      if (first) {
        first = false;
      } else {
        ret += ' ';
      }
      ret += this.printObj(obj.car());
      obj = obj.cdr();
    }
    if (obj.tag == 'nil') {
      return '(' + ret + ')';
    }
    return '(' + ret + ' . ' + this.printObj(obj) + ')';
  }

  function findVar(sym : LObj, env : LObj) : LObj {
    while (env.tag == 'cons') {
      var alist = env.car();
      while (alist.tag == 'cons') {
        if (alist.car().car() == sym) {
          return alist.car();
        }
        alist = alist.cdr();
      }
      env = env.cdr();
    }
    return Nil.nil;
  }

  function addToEnv(sym : LObj, val : LObj, env : LObj) : void {
    env.set_car(new Cons(new Cons(sym, val), env.car()));
  }

  function eval(obj : LObj, env : LObj) : LObj {
    if (obj.tag == 'nil' || obj.tag == 'num' || obj.tag == 'error') {
      return obj;
    } else if (obj.tag == 'sym') {
      var bind = this.findVar(obj, env);
      if (bind == Nil.nil) {
        return new Error1(obj.str() + ' has no value');
      }
      return bind.cdr();
    }

    var op = Cons.safeCar(obj);
    var args = Cons.safeCdr(obj);
    if (op == Symbol.make('quote')) {
      return Cons.safeCar(args);
    } else if (op == Symbol.make('if')) {
      if (this.eval(Cons.safeCar(args), env) == Nil.nil) {
        return this.eval(Cons.safeCar(Cons.safeCdr(Cons.safeCdr(args))), env);
      }
      return this.eval(Cons.safeCar(Cons.safeCdr(args)), env);
    } else if (op == Symbol.make('lambda')) {
      return new Expr(args, env);
    } else if (op == Symbol.make('defun')) {
      var expr = new Expr(Cons.safeCdr(args), env);
      var sym = Cons.safeCar(args);
      this.addToEnv(sym, expr, this.g_env);
      return sym;
    } else if (op == Symbol.make('setq')) {
      var val = this.eval(Cons.safeCar(Cons.safeCdr(args)), env);
      var sym = Cons.safeCar(args);
      var bind = this.findVar(sym, env);
      if (bind == Nil.nil) {
        this.addToEnv(sym, val, this.g_env);
      } else {
        bind.set_cdr(val);
      }
      return val;
    }
    return this.apply(this.eval(op, env), this.evlis(args, env), env);
  }

  function evlis(lst : LObj, env : LObj) : LObj {
    var ret : LObj = Nil.nil;
    while (lst.tag == 'cons') {
      var elm = this.eval(lst.car(), env);
      if (elm.tag == 'error') {
        return elm;
      }
      ret = new Cons(elm, ret);
      lst = lst.cdr();
    }
    return this.nreverse(ret);
  }

  function progn(body : LObj, env : LObj) : LObj {
    var ret : LObj = Nil.nil;
    while (body.tag == 'cons') {
      ret = this.eval(body.car(), env);
      body = body.cdr();
    }
    return ret;
  }

  function apply(fn : LObj, args : LObj, env : LObj) : LObj {
    if (fn.tag == 'error') {
      return fn;
    } else if (args.tag == 'error') {
      return args;
    } else if (fn.tag == 'subr') {
      return fn.fn()(args);
    } else if (fn.tag == 'expr') {
      return this.progn(fn.body(),
                        new Cons(this.pairlis(fn.args(), args), fn.env()));
    }
    return new Error1(this.printObj(fn) + ' is not function');
  }

  var subrCar = function(args : LObj) : LObj {
    return Cons.safeCar(Cons.safeCar(args));
  };

  var subrCdr = function(args : LObj) : LObj {
    return Cons.safeCdr(Cons.safeCar(args));
  };

  var subrCons = function(args : LObj) : LObj {
    return new Cons(Cons.safeCar(args), Cons.safeCar(Cons.safeCdr(args)));
  };

  var subrEq = function(args : LObj) : LObj {
    var x = Cons.safeCar(args);
    var y = Cons.safeCar(Cons.safeCdr(args));
    if (x.tag == 'num' && y.tag == 'num') {
      if (x.num() == y.num()) {
        return Symbol.make('t');
      }
      return Nil.nil;
    } else if (x == y) {
      return Symbol.make('t');
    }
    return Nil.nil;
  };

  var subrAtom = function(args : LObj) : LObj {
    if (Cons.safeCar(args).tag == 'cons') {
      return Nil.nil;
    }
    return Symbol.make('t');
  };

  var subrNumberp = function(args : LObj) : LObj {
    if (Cons.safeCar(args).tag == 'num') {
      return Symbol.make('t');
    }
    return Nil.nil;
  };

  var subrSymbolp = function(args : LObj) : LObj {
    if (Cons.safeCar(args).tag == 'sym') {
      return Symbol.make('t');
    }
    return Nil.nil;
  };

  static function subrAddOrMul(fn : function (:number, :number) : number,
                               init_val : number) : function (:LObj) : LObj {
    return function(args : LObj) : LObj {
      var ret = init_val;
      while (args.tag == 'cons') {
        if (args.car().tag != 'num') {
          return new Error1('wrong type');
        }
        ret = fn(ret, args.car().num());
        args = args.cdr();
      }
      return new Num(ret);
    };
  }
  var subrAdd = Lisp.subrAddOrMul((x : number, y :number) -> x + y, 0);
  var subrMul = Lisp.subrAddOrMul((x : number, y :number) -> x * y, 1);

  static function subrSubOrDivOrMod(fn : function (:number, :number) : number)
      : function (:LObj) : LObj {
    return function(args : LObj) : LObj {
      var x = Cons.safeCar(args);
      var y = Cons.safeCar(Cons.safeCdr(args));
      if (x.tag != 'num' || y.tag != 'num') {
        return new Error1('wrong type');
      }
      return new Num(fn(x.num(), y.num()));
    };
  }
  var subrSub = Lisp.subrSubOrDivOrMod((x : number, y :number) -> x - y);
  var subrDiv = Lisp.subrSubOrDivOrMod((x : number, y :number) -> x / y);
  var subrMod = Lisp.subrSubOrDivOrMod((x : number, y :number) -> x % y);

  function constructor() {
    this.addToEnv(Symbol.make('car'), new Subr(this.subrCar), this.g_env);
    this.addToEnv(Symbol.make('cdr'), new Subr(this.subrCdr), this.g_env);
    this.addToEnv(Symbol.make('cons'), new Subr(this.subrCons), this.g_env);
    this.addToEnv(Symbol.make('eq'), new Subr(this.subrEq), this.g_env);
    this.addToEnv(Symbol.make('atom'), new Subr(this.subrAtom), this.g_env);
    this.addToEnv(Symbol.make('numberp'),
                  new Subr(this.subrNumberp), this.g_env);
    this.addToEnv(Symbol.make('symbolp'),
                  new Subr(this.subrSymbolp), this.g_env);
    this.addToEnv(Symbol.make('+'), new Subr(this.subrAdd), this.g_env);
    this.addToEnv(Symbol.make('*'), new Subr(this.subrMul), this.g_env);
    this.addToEnv(Symbol.make('-'), new Subr(this.subrSub), this.g_env);
    this.addToEnv(Symbol.make('/'), new Subr(this.subrDiv), this.g_env);
    this.addToEnv(Symbol.make('mod'), new Subr(this.subrMod), this.g_env);
    this.addToEnv(Symbol.make('t'), Symbol.make('t'), this.g_env);
  }
}

native __fake__ class Process {
  var stdout : Stdout;
  function openStdin() : Stdin;
}
native __fake__ class Stdin {
  function setEncoding(str : string) : void;
  function on(str : string, fn : variant) : void;
}
native __fake__ class Stdout {
  function write(str : string) : void;
}

class _Main {
  static function main(args : string[]) : void {
    var lisp = new Lisp;
    var process = js.global['process'] as __noconvert__ Process;
    var stdin = process.openStdin();
    stdin.setEncoding('utf8');
    process.stdout.write('> ');
    stdin.on('data', function (input : string) {
      log lisp.printObj(lisp.eval(lisp.read(input).obj, lisp.g_env));
      process.stdout.write('> ');
    });
  }
}
