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

class Lisp {
  var kLPar = '(';
  var kRPar = ')';
  var kQuote = "'";
  var kNil = Nil.nil;

  function read(str : string) : LObj {
    return Symbol.make(str);
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
      log lisp.read(input);
      process.stdout.write('> ');
    });
  }
}
