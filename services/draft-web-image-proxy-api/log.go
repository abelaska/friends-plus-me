package main

import (
    "io"
    "log"
    "fmt"
)

var (
    _Debug   *log.Logger
    _Info    *log.Logger
    _Warning *log.Logger
    _Error   *log.Logger
)

func InitLog(debugHandle io.Writer, infoHandle io.Writer, warningHandle io.Writer, errorHandle io.Writer) {
    _Debug = log.New(debugHandle,     "DEBUG   ", log.Ldate|log.Ltime|log.Lmicroseconds)
    _Info = log.New(infoHandle,       "INFO    ", log.Ldate|log.Ltime|log.Lmicroseconds)
    _Warning = log.New(warningHandle, "WARNING ", log.Ldate|log.Ltime|log.Lmicroseconds)
    _Error = log.New(errorHandle,     "ERROR   ", log.Ldate|log.Ltime|log.Lmicroseconds)
}

func Log(logger *log.Logger, format string, v ...interface{}) {
    if len(v) > 0 {
        logger.Println(fmt.Sprintf(format, v...))
    } else {
        logger.Println(format)
    }
}

func Debug(format string, v ...interface{}) {
    Log(_Debug, format, v...);
}

func Error(format string, v ...interface{}) {
    Log(_Error, format, v...);
}

func Warning(format string, v ...interface{}) {
    Log(_Warning, format, v...);
}

func Info(format string, v ...interface{}) {
    Log(_Info, format, v...);
}

// example use
// func main() {
//     Init(ioutil.Discard, os.Stdout, os.Stdout, os.Stderr)
//     Trace.Println("I have something standard to say")
//     Info.Println("Special Information")
//     Warning.Println("There is something you need to know about")
//     Error.Println("Something has failed")
// }