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
  var kNil = Nil.nil;

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
      log lisp.printObj(lisp.read(input).obj);
      process.stdout.write('> ');
    });
  }
}
